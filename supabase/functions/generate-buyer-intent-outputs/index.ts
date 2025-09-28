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
    const { productId } = await req.json();

    if (!productId) {
      return new Response(JSON.stringify({ error: 'Product ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating responses for prompts of product:', productId);

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

    // Fetch prompts for the product
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', userData.user.id);

    if (promptsError) {
      throw new Error(`Failed to fetch prompts: ${promptsError.message}`);
    }

    if (!prompts || prompts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No prompts found for this product',
        responsesGenerated: 0,
        responses: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${prompts.length} prompts to generate responses for`);

    // Create assistant for generating responses
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        name: 'Advanced Product Research Assistant',
        instructions: `You are an expert product research assistant that provides comprehensive, informative responses to buyer-intent queries. Your responses should simulate what a well-informed consumer would find when researching products online.

RESPONSE GUIDELINES:
1. Comprehensive Coverage: Provide detailed, helpful information that addresses the user's query completely
2. Natural Language: Write in a conversational, informative tone that feels authentic
3. Specific Details: Include relevant product features, benefits, comparisons, and purchasing considerations
4. Multiple Perspectives: When appropriate, mention different options, price points, or alternatives
5. Actionable Information: Include practical advice about where to buy, what to look for, timing considerations

CONTENT STRATEGY:
- For "buy" queries: Focus on purchasing options, availability, pricing, and vendor recommendations
- For "best" queries: Provide comparisons, top features, and reasons why specific products excel
- For "reviews" queries: Summarize key user feedback, pros/cons, and overall satisfaction
- For comparison queries: Highlight differences, use cases, and recommendations for different needs
- For price queries: Discuss value propositions, deals, and cost considerations

BRAND MENTION STRATEGY:
- Naturally incorporate the specific product/brand name being queried
- Mention the brand early in the response when relevant
- Include the brand in context with competitors and alternatives
- Use the brand name in actionable recommendations

Response length: 150-300 words for comprehensive coverage while maintaining engagement.`,
      }),
    });

    if (!assistantResponse.ok) {
      throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();

    // Generate responses for each prompt (sequentially)
    const responses = [];
    
    for (const prompt of prompts) {
      console.log(`Generating response for prompt ${prompt.id}...`);
      
      try {
        // Create thread
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({}),
        });

        if (!threadResponse.ok) {
          console.error(`Failed to create thread for prompt ${prompt.id}`);
          continue;
        }

        const thread = await threadResponse.json();

        // Add message to thread
        await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            role: 'user',
            content: prompt.content,
          }),
        });

        // Start run
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistant.id,
          }),
        });

        if (!runResponse.ok) {
          console.error(`Failed to start run for prompt ${prompt.id}`);
          continue;
        }

        const run = await runResponse.json();

        // Poll for completion
        let runStatus = run.status;
        while (runStatus === 'queued' || runStatus === 'in_progress') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          });
          
          const statusData = await statusResponse.json();
          runStatus = statusData.status;
        }

        if (runStatus !== 'completed') {
          console.error(`Run failed for prompt ${prompt.id} with status: ${runStatus}`);
          continue;
        }

        // Get messages
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });

        const messagesData = await messagesResponse.json();
        const responseText = messagesData.data[0].content[0].text.value;

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
      } catch (promptError) {
        console.error(`Error processing prompt ${prompt.id}:`, promptError);
        continue;
      }
    }
    
    console.log(`Generated ${responses.length}/${prompts.length} responses`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      responsesGenerated: responses.length,
      responses: responses,
      message: 'Responses generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-buyer-intent-outputs function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});