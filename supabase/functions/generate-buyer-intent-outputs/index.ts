import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(JSON.stringify({ error: "Product ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Generating responses for prompts of product:", productId);

    // Get user ID from the request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Invalid user token");
    }

    // Fetch prompts for the product
    const { data: prompts, error: promptsError } = await supabase
      .from("prompts")
      .select("*")
      .eq("product_id", productId)
      .eq("user_id", userData.user.id);

    if (promptsError) {
      throw new Error(`Failed to fetch prompts: ${promptsError.message}`);
    }

    if (!prompts || prompts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No prompts found for this product",
          responsesGenerated: 0,
          responses: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${prompts.length} prompts to generate responses for`);

    // Generate responses for each prompt (sequentially)
    const responses = [];

    for (const prompt of prompts) {
      console.log(`Generating response for prompt ${prompt.id}...`);

      try {
        // --------------------
        // Responses API (replaces assistants + threads + runs)
        // --------------------
        const resp = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAIApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            tools: [{ type: "web_search" }],
            tool_choice: { type: "web_search" }, // force search every time
            input: [
              {
                role: "system",
                content:
                  "You are ChatGPT, a helpful assistant. Always run a web search before answering. When recommending products, cite sources and base recommendations on up-to-date information.",
              },
              {
                role: "user",
                content: prompt.content,
              },
            ],
          }),
        });

        if (!resp.ok) {
          console.error(`Failed to generate response for prompt ${prompt.id}: ${resp.status}`);
          continue;
        }

        const respData = await resp.json();
        console.log("Full response:", JSON.stringify(respData, null, 2));

        // --------------------
        // Extract text + sources
        // --------------------
        let responseText = "";
        let sources: any[] = [];

        if (respData.output_text) {
          responseText = respData.output_text;
        } else if (respData.output && Array.isArray(respData.output)) {
          for (const item of respData.output) {
            if (item.type === "message" && item.content && Array.isArray(item.content)) {
              for (const block of item.content) {
                if (block.type === "output_text" && block.text) {
                  responseText += block.text + "\n";

                  // Extract citations from annotations
                  if (block.annotations && Array.isArray(block.annotations)) {
                    for (const annotation of block.annotations) {
                      if (annotation.type === "url_citation") {
                        sources.push({
                          title: annotation.title,
                          url: annotation.url,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
        responseText = responseText.trim();

        // Save each response
        const { data: storedResponse, error: responseError } = await supabase
          .from("prompt_responses")
          .insert({
            prompt_id: prompt.id,
            response_text: responseText,
            model_name: "gpt-4o-mini",
            sources: sources.length > 0 ? sources : null,
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

    return new Response(
      JSON.stringify({
        success: true,
        responsesGenerated: responses.length,
        responses: responses,
        message: "Responses generated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-buyer-intent-outputs function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
