import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productTitle, productType, vendor, tags } = await req.json();

    if (!productId || !productTitle) {
      return new Response(JSON.stringify({ error: 'Product ID and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating buyer-intent prompts for product:', productTitle);

    // Create detailed prompt for OpenAI
    const systemPrompt = `You are an expert e-commerce copywriter specializing in buyer-intent keywords. Generate 15 specific, actionable buyer-intent prompts that potential customers would use when they're ready to purchase this product.

Product Details:
- Title: ${productTitle}
- Type: ${productType || 'Not specified'}
- Vendor: ${vendor || 'Not specified'}
- Tags: ${tags?.join(', ') || 'Not specified'}

Requirements:
1. Each prompt should be 3-15 words long
2. Focus on buyer-intent keywords (buy, purchase, best, reviews, deals, where to buy, etc.)
3. Include variations with and without brand names
4. Include price-focused queries
5. Include comparison queries
6. Include urgent/immediate purchase intent
7. Make them specific to the product type and features

Return ONLY a JSON array of 15 strings, no additional formatting or explanation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content:', generatedContent);

    // Parse the JSON response
    let prompts;
    try {
      // Clean the response by removing markdown code block formatting
      let cleanedContent = generatedContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      prompts = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(prompts) || prompts.length !== 15) {
      throw new Error('Invalid response format from AI');
    }

    // Get user ID from the request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('Invalid user token');
    }

    console.log('Inserting prompts into database for user:', userData.user.id);

    // Insert prompts into database
    const promptsToInsert = prompts.map(promptText => ({
      user_id: userData.user.id,
      product_id: productId,
      content: promptText,
      active: true,
      status: 'suggested'
    }));

    const { data: insertedPrompts, error: insertError } = await supabase
      .from('prompts')
      .insert(promptsToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Failed to save prompts: ${insertError.message}`);
    }

    console.log(`Successfully generated and saved ${insertedPrompts.length} buyer-intent prompts`);

    // Start background task for response generation and scoring
    const backgroundTask = async () => {
      console.log('Starting background task: Generating responses for each prompt...');
      const responses = [];
      
      for (const prompt of insertedPrompts) {
        try {
          const promptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'user', content: prompt.content }
              ],
              max_tokens: 500,
              temperature: 0.7,
            }),
          });

          if (!promptResponse.ok) {
            console.error(`Failed to get response for prompt ${prompt.id}:`, promptResponse.status);
            continue;
          }

          const promptData = await promptResponse.json();
          const responseText = promptData.choices[0].message.content;

          // Store response in database
          const { data: storedResponse, error: responseError } = await supabase
            .from('prompt_responses')
            .insert({
              prompt_id: prompt.id,
              response_text: responseText,
              model_name: 'gpt-4o-mini'
            })
            .select()
            .single();

          if (responseError) {
            console.error(`Failed to store response for prompt ${prompt.id}:`, responseError);
          } else {
            responses.push(storedResponse);
            console.log(`Generated response ${responses.length}/${insertedPrompts.length}`);
          }
        } catch (error) {
          console.error(`Error processing prompt ${prompt.id}:`, error);
        }
      }

      console.log(`Generated ${responses.length} prompt responses`);

      // Calculate visibility score by analyzing all responses
      if (responses.length > 0) {
        console.log('Calculating visibility scores...');
        
        // Combine all responses for analysis
        const allResponsesText = responses.map(r => r.response_text).join('\n\n');
        
        const scoringPrompt = `You are an expert research analyst. Given a collection of AI-generated responses to buyer-intent prompts, provide a score of 1-100 based on how visible the product "${productTitle}" (or variations of it) is mentioned across ALL the responses. 

Consider:
- How many responses mention the product by name
- The prominence of mentions (title, early in text, etc.)
- Overall brand visibility across the response set

Respond with ONLY a number between 1-100, nothing else.

Responses to analyze:
${allResponsesText}`;

        try {
          const scoringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              temperature: 0.1,
            }),
          });

          if (scoringResponse.ok) {
            const scoringData = await scoringResponse.json();
            const scoreText = scoringData.choices[0].message.content.trim();
            const visibilityScore = parseInt(scoreText) || 0;

            console.log(`Calculated visibility score: ${visibilityScore}`);

            // Update all prompts with the visibility score
            const { error: updateError } = await supabase
              .from('prompts')
              .update({ visibility_score: visibilityScore })
              .in('id', insertedPrompts.map(p => p.id));

            if (updateError) {
              console.error('Failed to update visibility scores:', updateError);
            } else {
              console.log('Successfully updated visibility scores for all prompts');
            }
          } else {
            console.error('Failed to calculate visibility score:', scoringResponse.status);
          }
        } catch (error) {
          console.error('Error calculating visibility score:', error);
        }
      }
    };

    // Start background task
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediate response
    return new Response(JSON.stringify({ 
      success: true, 
      promptsGenerated: insertedPrompts.length,
      prompts: insertedPrompts,
      message: 'Prompts generated successfully. Response generation and scoring in progress...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-buyer-intent-prompts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});