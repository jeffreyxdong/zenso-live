import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { storeId } = await req.json();

    if (!storeId) {
      throw new Error('Store ID is required');
    }

    console.log(`Generating brand analytics for store: ${storeId}`);

    // Fetch store information
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('name, website')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      throw new Error('Store not found');
    }

    console.log(`Store found: ${store.name} - ${store.website}`);

    // Step 1: Generate brand-level prompts using OpenAI
    const promptGenerationPrompt = `You are an AI research assistant specializing in brand analysis and market intelligence.

Generate exactly 5 search queries that would help understand the brand's market presence, reputation, and visibility in AI responses.

Brand Name: ${store.name}
Website: ${store.website}

Focus on:
1. Brand comparisons and alternatives
2. Brand reviews and reputation
3. Brand recommendations in specific contexts
4. Industry leadership and innovation
5. Customer experience and satisfaction

Return ONLY a JSON array of strings, nothing else. Each string should be a natural search query.

Example format:
["query 1", "query 2", "query 3", "query 4", "query 5"]`;

    console.log('Generating prompts with OpenAI...');

    const promptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: promptGenerationPrompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!promptResponse.ok) {
      throw new Error(`OpenAI API error: ${promptResponse.statusText}`);
    }

    const promptData = await promptResponse.json();
    const generatedPromptsText = promptData.choices?.[0]?.message?.content?.trim() || '';
    
    console.log('Raw prompts response:', generatedPromptsText);

    let prompts: string[] = [];
    try {
      const cleanedText = generatedPromptsText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      prompts = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse prompts JSON:', parseError);
      throw new Error('Failed to parse generated prompts');
    }

    console.log(`Generated ${prompts.length} prompts`);

    // Store prompts in database
    const promptRecords = prompts.map(content => ({
      content,
      user_id: user.id,
      store_id: storeId,
      brand_name: store.name,
      status: 'active',
      active: true,
    }));

    const { data: insertedPrompts, error: insertError } = await supabase
      .from('prompts')
      .insert(promptRecords)
      .select();

    if (insertError) {
      console.error('Error inserting prompts:', insertError);
      throw new Error('Failed to store prompts');
    }

    console.log(`Stored ${insertedPrompts.length} prompts in database`);

    // Step 2: Generate responses for each prompt
    const responses: Array<{ promptId: string; responseText: string; visibilityScore: number }> = [];

    for (const prompt of insertedPrompts) {
      console.log(`Generating response for prompt: ${prompt.content}`);

      const responsePrompt = `${prompt.content}

Please provide a comprehensive response as if answering a user's search query.`;

      const responseData = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful AI assistant providing informative responses to user queries.' },
            { role: 'user', content: responsePrompt }
          ],
          max_tokens: 1000,
        }),
      });

      if (!responseData.ok) {
        console.error(`Failed to generate response for prompt ${prompt.id}`);
        continue;
      }

      const responseJson = await responseData.json();
      const responseText = responseJson.choices?.[0]?.message?.content || '';

      console.log(`Response generated (${responseText.length} chars)`);

      // Step 3: Score visibility
      console.log(`Scoring brand visibility for: ${store.name}`);

      const contentLower = responseText.toLowerCase();
      const brandLower = store.name.toLowerCase();
      
      const exactMatch = contentLower.includes(brandLower);
      const wordBoundaryMatch = new RegExp(`\\b${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(responseText);
      const partialMatch = brandLower.split(' ').some((word: string) => word.length > 2 && contentLower.includes(word));
      
      const brandMentioned = exactMatch || wordBoundaryMatch || partialMatch;
      
      let visibilityScore = 0;

      if (brandMentioned) {
        const scoringPrompt = `You are an expert research analyst. The brand "${store.name}" is mentioned in this content. Provide a visibility score of 1-100 based on how prominently and visibly the brand is featured. Consider factors like:
- Position in the content (earlier mentions score higher)
- Context of the mention (positive context, recommendations score higher)
- Frequency of mentions
- Overall prominence in the response

Respond with ONLY a number between 1-100, nothing else.

Content to analyze:
${responseText}`;

        const scoreResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'user', content: scoringPrompt }
            ],
            max_tokens: 10,
          }),
        });

        if (scoreResponse.ok) {
          const scoreData = await scoreResponse.json();
          const scoreText = scoreData.choices?.[0]?.message?.content?.trim() || '0';
          visibilityScore = parseInt(scoreText) || 0;
          console.log(`Visibility score: ${visibilityScore}`);
        }
      } else {
        console.log(`Brand "${store.name}" not mentioned - visibility score 0`);
      }

      // Store response
      await supabase
        .from('prompt_responses')
        .insert({
          prompt_id: prompt.id,
          response_text: responseText,
          model_name: 'gpt-4o-mini',
        });

      // Update prompt with visibility score
      await supabase
        .from('prompts')
        .update({ visibility_score: visibilityScore })
        .eq('id', prompt.id);

      responses.push({
        promptId: prompt.id,
        responseText,
        visibilityScore,
      });
    }

    // Calculate average visibility score
    const avgVisibility = responses.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.visibilityScore, 0) / responses.length)
      : 0;

    console.log(`Brand analytics complete. Average visibility: ${avgVisibility}`);

    return new Response(
      JSON.stringify({
        success: true,
        promptsGenerated: prompts.length,
        responsesGenerated: responses.length,
        averageVisibility: avgVisibility,
        responses,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in brand-analytics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
