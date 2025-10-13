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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, productTitle } = await req.json();

    if (!productId || !productTitle) {
      return new Response(JSON.stringify({ error: "Product ID and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Scoring responses for product:", productTitle);

    // Get user ID
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid user token");

    // Fetch all responses for this product
    const { data: responses, error: responsesError } = await supabase
      .from("prompt_responses")
      .select(
        `
        id,
        response_text,
        prompts!inner(product_id, user_id)
      `,
      )
      .eq("prompts.product_id", productId)
      .eq("prompts.user_id", userData.user.id);

    if (responsesError) throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No responses found for this product",
          scores: null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${responses.length} responses to analyze`);

    const allResponsesText = responses.map((r) => r.response_text).join("\n\n---\n\n");

    // Call Responses API
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: `You are an expert research analyst scoring brand mentions in AI-generated responses. 
You will be given a collection of multiple responses (a large text blob). 
Evaluate them collectively and return four scores. Use the definitions below.

Step 1 – Visibility Score:  
A 0–100 score based on whether and how prominently the brand is mentioned overall across all responses.

Step 2 – Position Score:  
A 0–100 score measuring how prominently the brand is mentioned based on position.  

Step 3 – Sentiment Score:  
A 0–100 score reflecting tone of mentions toward the brand.  

Step 4 - Source Information: When a product is mentioned, output an array of all the sources that mentioned it. 

Step 5 - AI_Mentions: Count all times the product was mentioned. Provide a single number.

Return ONLY a JSON object in this format:
{
  "visibility_score": 85,
  "position_score": 72,
  "sentiment_score": 91,
  "sources": ["source1", "source2"],
  "ai_mentions": 8
}`,
          },
          {
            role: "user",
            content: `Here is the collection of responses for the product "${productTitle}".  
They are multiple outputs bundled together. Score them collectively:

${allResponsesText}`,
          },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);

    const respData = await resp.json();
    console.log("Raw scoring response:", JSON.stringify(respData, null, 2));

    let scoresText = respData.output_text ?? respData.output?.[0]?.content?.[0]?.text ?? "";

    if (scoresText.startsWith("```json")) {
      scoresText = scoresText.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
    } else if (scoresText.startsWith("```")) {
      scoresText = scoresText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const scores = JSON.parse(scoresText);
    console.log("Parsed scores object:", JSON.stringify(scores, null, 2));

    const visibilityScore = parseInt(scores.visibility_score) || 0;
    const positionScore = parseInt(scores.position_score) || 0;
    const sentimentScore = parseInt(scores.sentiment_score) || 0;
    const aiMentions = parseInt(scores.ai_mentions) || 0; // ✅ NEW LINE
    const sources = scores.sources || [];

    console.log("Extracted sources:", JSON.stringify(sources, null, 2));
    console.log("AI Mentions count:", aiMentions); // ✅ DEBUG LOG
    console.log("Number of responses to update:", responses.length);

    // Save sources to all prompt_responses that were analyzed
    if (sources.length > 0 && responses.length > 0) {
      const responseIds = responses.map((r) => r.id);
      console.log("Response IDs to update:", responseIds);

      const { data: updateData, error: updateError } = await supabase
        .from("prompt_responses")
        .update({ sources_final: sources })
        .in("id", responseIds)
        .select();

      if (updateError) {
        console.error("Failed to update sources:", updateError);
      } else {
        console.log(`Successfully updated sources for ${responseIds.length} responses`);
      }
    }

    // ✅ Save ai_mentions into product_scores
    const { data: insertedScore, error: scoreError } = await supabase
      .from("product_scores")
      .insert({
        product_id: productId,
        visibility_score: visibilityScore,
        position_score: positionScore,
        sentiment_score: sentimentScore,
        ai_mentions: aiMentions, // ✅ NEW FIELD SAVED
      })
      .select()
      .single();

    if (scoreError) throw new Error(`Failed to save scores: ${scoreError.message}`);

    console.log(`Inserted scores for product ${productId}:`, insertedScore);

    return new Response(
      JSON.stringify({
        success: true,
        scores: {
          visibility_score: visibilityScore,
          position_score: positionScore,
          sentiment_score: sentimentScore,
          ai_mentions: aiMentions, // ✅ INCLUDED IN RESPONSE
        },
        scoreId: insertedScore.id,
        message: "Product scores calculated and saved successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in score-buyer-intent-outputs function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
