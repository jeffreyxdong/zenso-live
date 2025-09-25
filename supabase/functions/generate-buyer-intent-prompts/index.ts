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
    const { productId, productTitle, productType, vendor, tags, storeId } = await req.json();

    if (!productId || !productTitle || !storeId) {
      return new Response(JSON.stringify({ error: 'Product ID, title, and store ID are required' }), {
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
      
      // Try to parse as JSON first
      try {
        prompts = JSON.parse(cleanedContent);
      } catch (jsonError) {
        // If direct JSON parsing fails, try to extract array from the content
        console.log('Direct JSON parsing failed, attempting to extract array...');
        
        // Look for array pattern in the content
        const arrayMatch = cleanedContent.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          prompts = JSON.parse(arrayMatch[0]);
        } else {
          // If no array found, try to split by lines and create array
          const lines = cleanedContent.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
            .map(line => line.replace(/^["']|["']$/g, '').replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''))
            .filter(line => line.length > 0);
          
          if (lines.length >= 10) {
            prompts = lines.slice(0, 15);
          } else {
            throw jsonError;
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', generatedContent);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(prompts) || prompts.length < 10) {
      console.error('Invalid prompts array:', prompts);
      throw new Error(`Invalid response format from AI - expected array of 10-15 strings, got ${prompts?.length || 0}`);
    }

    // Ensure we have exactly 15 prompts
    if (prompts.length < 15) {
      console.log(`Got ${prompts.length} prompts, generating additional ones...`);
      // Duplicate some prompts with slight variations if we have fewer than 15
      while (prompts.length < 15 && prompts.length > 0) {
        const randomPrompt = prompts[Math.floor(Math.random() * Math.min(prompts.length, 5))];
        prompts.push(randomPrompt + ' deals');
      }
    } else if (prompts.length > 15) {
      prompts = prompts.slice(0, 15);
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
      store_id: storeId,
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
    
    // STEP 2: Generate responses for each prompt (sequentially)
    const responses = [];
    
    for (const prompt of insertedPrompts) {
      console.log(`Generating response for prompt ${prompt.id}...`);
      const promptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt.content }],
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
    
      // Save each response
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
      }
    }
    
    console.log(`Generated ${responses.length}/${insertedPrompts.length} responses`);
    
    // STEP 3: Calculate comprehensive scores for the product
    if (responses.length > 0) {
      const allResponsesText = responses.map(r => r.response_text).join('\n\n');
    
      const comprehensiveScoringPrompt = `You are an expert research analyst scoring brand mentions in AI-generated responses. 
Your job has three sequential steps. Return results in order as a JSON object.

Step 1 – Visibility Score:  
A 0–100 score based on whether and how prominently the brand "${productTitle}" is mentioned overall.

Step 2 – Position Score:  
Calculate a "Position Score" from 0–100 that measures how prominently the brand is mentioned based on its position in the text.

Instructions for Position Score:
1. Identify all mentions of the specified brand in the output.
2. Weight earlier mentions more heavily (mentions in the first 10% of the text contribute most).
3. Apply diminishing returns for multiple mentions (first mention carries the most weight).
4. Normalize result to 0–100 (0 = no mention, 100 = mentioned first, prominently, and multiple times).

Step 3 – Sentiment Score:  
Calculate a "Sentiment Score" from 0–100 that represents the tone of mentions toward the brand.

Instructions for Sentiment Score:
1. Analyze the sentiment of each mention (positive, neutral, negative).
2. Heavily weight sentiment that appears near the first mention.
3. Map sentiment to numeric score:  
   • Very positive = 80–100  
   • Slightly positive = 60–79  
   • Neutral / descriptive = 40–59  
   • Slightly negative = 20–39  
   • Very negative = 0–19  
4. Normalize result to a single 0–100 number.

Return ONLY a JSON object with this format:
{
  "visibility_score": 85,
  "position_score": 72,
  "sentiment_score": 91
}

Responses to analyze:
${allResponsesText}`;
    
      const scoringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: comprehensiveScoringPrompt }],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });
    
      if (scoringResponse.ok) {
        const scoringData = await scoringResponse.json();
        const scoresText = scoringData.choices[0].message.content.trim();
        
        try {
          // Parse the JSON response
          let cleanedScores = scoresText;
          if (cleanedScores.startsWith('```json')) {
            cleanedScores = cleanedScores.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
          } else if (cleanedScores.startsWith('```')) {
            cleanedScores = cleanedScores.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const scores = JSON.parse(cleanedScores);
          const visibilityScore = parseInt(scores.visibility_score) || 0;
          const positionScore = parseInt(scores.position_score) || 0;
          const sentimentScore = parseInt(scores.sentiment_score) || 0;
    
          console.log(`Calculated scores for product: ${productTitle}`);
          console.log(`Visibility: ${visibilityScore}, Position: ${positionScore}, Sentiment: ${sentimentScore}`);
    
          // Update the product with all three scores
          const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ 
              visibility_score: visibilityScore,
              position_score: positionScore,
              sentiment_score: sentimentScore
            })
            .eq('id', productId)
            .select();
    
          if (updateError) {
            console.error('Failed to update product scores:', updateError);
          } else {
            console.log(`Updated product ${productId} with comprehensive scores`);
          }
        } catch (parseError) {
          console.error('Failed to parse scoring response:', scoresText);
          console.error('Parse error:', parseError);
        }
      } else {
        console.error('Failed to calculate comprehensive scores:', scoringResponse.status);
      }
    }
    
    // Return AFTER everything finishes
    return new Response(JSON.stringify({ 
      success: true, 
      promptsGenerated: insertedPrompts.length,
      prompts: insertedPrompts,
      message: 'Prompts generated and scored successfully'
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
