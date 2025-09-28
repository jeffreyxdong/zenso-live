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

    // Create assistant
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        name: 'Advanced Buyer Intent Prompt Generator',
        instructions: `You are an expert e-commerce researcher and copywriter specializing in high-converting buyer-intent search queries. Your task is to generate 15 highly specific, actionable buyer-intent prompts that capture real customer search behavior when they're ready to make a purchase.

CRITICAL REQUIREMENTS:
1. Length: Each prompt must be 4-20 words to match real search patterns
2. Intent Focus: All prompts must show clear purchase intent using power words like:
   - Transaction: buy, purchase, order, get, shop for
   - Comparison: best, top, vs, compare, alternative to
   - Reviews/Social Proof: reviews, ratings, testimonials, recommended
   - Location/Availability: where to buy, near me, in stock, available
   - Price/Deals: cheap, discount, sale, price, cost, deals
   - Urgency: now, today, immediate, fast shipping

3. Specificity Levels:
   - 5 prompts with exact brand/product name
   - 5 prompts with product category + features
   - 5 prompts with comparative or generic terms

4. Real Search Patterns:
   - Include natural language variations
   - Mix question formats ("where can I buy...") with statement formats ("buy X online")
   - Include mobile-friendly shorter queries
   - Add location-based and urgency modifiers

5. Buyer Journey Stages:
   - Research phase: "best X reviews 2024"
   - Comparison phase: "X vs Y which is better"
   - Purchase phase: "buy X with free shipping"
   - Immediate need: "X in stock near me"

RESPONSE FORMAT: Return ONLY a clean JSON array of exactly 15 strings. No markdown, no explanations, no additional text.

Example format: ["buy [product] online with warranty", "best [category] deals this month", ...]`,
      }),
    });

    if (!assistantResponse.ok) {
      throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();

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
      throw new Error(`Failed to create thread: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();

    // Add message to thread
    const messageContent = `Generate buyer-intent prompts for this product:
- Title: ${productTitle}
- Type: ${productType || 'Not specified'}
- Vendor: ${vendor || 'Not specified'}
- Tags: ${tags?.join(', ') || 'Not specified'}`;

    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent,
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
      throw new Error(`Failed to start run: ${runResponse.status}`);
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
      throw new Error(`Run failed with status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const messagesData = await messagesResponse.json();
    const generatedContent = messagesData.data[0].content[0].text.value;

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
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.startsWith('//') && !line.startsWith('#'))
            .map((line: string) => line.replace(/^["']|["']$/g, '').replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''))
            .filter((line: string) => line.length > 0);
          
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
    
    return new Response(JSON.stringify({ 
      success: true, 
      promptsGenerated: insertedPrompts.length,
      prompts: insertedPrompts,
      message: 'Buyer-intent prompts generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-buyer-intent-prompts function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
