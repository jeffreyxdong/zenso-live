import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Starting daily product scores generation...');

    // Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, created_at')
      .eq('status', 'active');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products', details: productsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      console.log('No active products found');
      return new Response(
        JSON.stringify({ message: 'No active products found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${products.length} active products`);

    let processedCount = 0;
    const today = new Date().toISOString().split('T')[0];

    // Process each product
    for (const product of products) {
      try {
        // Check if we already have a score for today
        const { data: existingScore } = await supabase
          .from('product_scores')
          .select('id')
          .eq('product_id', product.id)
          .gte('created_at', today)
          .maybeSingle();

        if (existingScore) {
          console.log(`Score already exists for product ${product.id} today`);
          continue;
        }

        // Fetch recent prompt responses for this product (last 24 hours)
        const { data: responses, error: responsesError } = await supabase
          .from('prompt_responses')
          .select('response_text, sources_final')
          .eq('prompt_id', supabase
            .from('prompts')
            .select('id')
            .eq('product_id', product.id)
            .eq('active', true)
          )
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        // Alternative query using inner join
        const { data: promptResponses } = await supabase
          .from('prompt_responses_with_prompts')
          .select('*')
          .eq('product_id', product.id)
          .eq('prompt_active', true)
          .gte('response_created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(10);

        if (!promptResponses || promptResponses.length === 0) {
          console.log(`No recent responses found for product ${product.id}, skipping scoring`);
          continue;
        }

        console.log(`Found ${promptResponses.length} responses for product ${product.id}`);

        // Concatenate all response texts
        const concatenatedText = promptResponses
          .map(r => r.response_text)
          .join('\n\n---\n\n');

        // Call OpenAI to score the responses
        const scoringPrompt = `You are an AI analyst evaluating how well a product appears in AI-generated responses. Analyze the following AI responses and provide scores for the product "${product.title}".

AI Responses:
${concatenatedText}

Please analyze these responses and provide:
1. Visibility Score (0-100): How prominently is the product mentioned? Higher = more prominent mentions
2. Position Score (0-100): In what position does the product typically appear? Higher = appears earlier/more prominently
3. Sentiment Score (0-100): How positive is the sentiment towards the product? Higher = more positive
4. Sources: List of unique domains mentioned
5. AI Mentions: Count how many responses actually mention the product

Return ONLY valid JSON with this exact structure:
{
  "visibility_score": number,
  "position_score": number,
  "sentiment_score": number,
  "sources": ["domain1.com", "domain2.com"],
  "ai_mentions": number
}`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a precise AI analyst. Return only valid JSON.' },
              { role: 'user', content: scoringPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error(`OpenAI API error for product ${product.id}:`, errorText);
          continue;
        }

        const openaiData = await openaiResponse.json();
        const scoringText = openaiData.choices[0].message.content;
        
        // Extract JSON from markdown code blocks if present
        const jsonMatch = scoringText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         scoringText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : scoringText;
        
        const scores = JSON.parse(jsonText);
        console.log(`Calculated scores for product ${product.id}:`, scores);

        // Insert the new score
        const { error: insertError } = await supabase
          .from('product_scores')
          .insert({
            product_id: product.id,
            visibility_score: Math.round(scores.visibility_score),
            sentiment_score: Math.round(scores.sentiment_score),
            position_score: Math.round(scores.position_score),
            ai_mentions: scores.ai_mentions || 0
          });

        if (insertError) {
          console.error(`Error inserting score for product ${product.id}:`, insertError);
        } else {
          console.log(`Generated scores for product ${product.id}`);
          processedCount++;
        }

      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
      }
    }

    console.log(`Completed processing. Generated scores for ${processedCount} products.`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: products.length,
        message: `Generated daily scores for ${processedCount} products`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Daily score generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Score generation failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});