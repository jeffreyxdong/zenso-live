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

    // --------------------
    // Responses API (replaces assistants + threads + runs)
    // --------------------
    const messageContent = `Generate buyer-intent prompts for this product:
    - Title: ${productTitle}
    - Type: ${productType || 'Not specified'}
    - Vendor: ${vendor || 'Not specified'}
    - Tags: ${tags?.join(', ') || 'Not specified'}`;
    
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: `You are an expert e-commerce copywriter. 
    Generate 5 specific, actionable buyer-intent search queries that potential customers would use when they're ready to purchase a product like this.
    
    Product Details:
    - Title: ${productTitle}
    - Type: ${productType || "Not specified"}
    - Vendor: ${vendor || "Not specified"}
    - Tags: ${tags?.join(", ") || "Not specified"}
    
    Requirements:
    1. Each query should be 3–25 words.
    2. Cover a wide range of buyer intents.
    3. Do NOT explicitly mention the product title, but at least one query must allude to it naturally.
    4. Keep outputs diverse and realistic.
    5. Return ONLY a JSON array of 5 strings, no extra text.
    6. Every prompt should be structured in such a way that the output will recommend at least one product.`
      }),
    });
    
    if (!resp.ok) {
      throw new Error(`OpenAI Responses API error: ${resp.status}`);
    }
    
    const respData = await resp.json();
    console.log("Full response:", JSON.stringify(respData, null, 2));
    
    // -------- FIXED EXTRACTION --------
    const generatedContent =
      respData.output?.[0]?.content
        ?.map((c: any) => c.text)
        .filter(Boolean)
        .join("\n") ?? "";

    if (!generatedContent) {
      throw new Error("No text content returned from OpenAI response");
    }
    // ----------------------------------

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

    console.log('Inserting prompts into database for user:', userData.user.id);

    // Insert prompts into database
    const promptsToInsert = prompts.map((promptText: string) => ({
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
