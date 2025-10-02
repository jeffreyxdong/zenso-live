import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { storeId } = await req.json();
    if (!storeId) throw new Error("Store ID is required");

    console.log(`Generating brand analytics for store: ${storeId}`);

    // === Fetch store info
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, website")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (storeError || !store) throw new Error("Store not found");
    console.log(`Store found: ${store.name} - ${store.website}`);

    // === Step 1: Generate search prompts
    const promptGenPrompt = `You are an AI research assistant.

Generate exactly 5 realistic search queries that a customer would type when shopping for products from ${store.website}.
Rules:
- Do NOT mention the brand "${store.name}" explicitly.
- Focus on purchase-intent queries (comparisons, reviews, best options, reliability, deals).
- Output ONLY a JSON array of strings.`;

    const promptResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: promptGenPrompt
      })
    });

    if (!promptResp.ok) throw new Error(`Prompt generation error: ${promptResp.statusText}`);
    const promptJson = await promptResp.json();
    const generatedText = promptJson.output_text?.trim() || "";

    let prompts: string[] = [];
    try {
      const cleaned = generatedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      prompts = JSON.parse(cleaned);
    } catch (e) {
      console.error("Prompt parse error:", e);
      throw new Error("Failed to parse generated prompts");
    }
    console.log(`Generated ${prompts.length} prompts`);

    // === Store prompts in DB
    const { data: insertedPrompts, error: insertError } = await supabase
      .from("brand_prompts")
      .insert(
        prompts.map((content) => ({
          content,
          user_id: user.id,
          store_id: storeId,
          brand_name: store.name,
          status: "active",
          active: true,
        }))
      )
      .select();

    if (insertError) throw new Error("Failed to store prompts");
    console.log(`Stored ${insertedPrompts.length} prompts`);

    // === Step 2: Generate responses + score for each prompt
    const responses: Array<{ promptId: string; responseText: string; visibilityScore: number }> = [];

    for (const prompt of insertedPrompts) {
      console.log(`Generating response for prompt: ${prompt.content}`);

      // Call GPT for response
      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: `${prompt.content}\n\nPlease provide a comprehensive response as if answering a customer's search query.`
        }),
      });

      if (!resp.ok) {
        console.error(`Failed response for prompt ${prompt.id}`);
        continue;
      }

      const json = await resp.json();
      const responseText = json.output_text ?? "";
      console.log(`Response generated (${responseText.length} chars)`);

      // Scoring
      const scoringPrompt = `Analyze the following content and assign a visibility score (0–100) for how prominently the brand "${store.name}" is represented overall.

Rules:
- If not mentioned at all → 0.
- If mentioned indirectly or briefly → 1–30.
- If mentioned moderately or in comparisons → 31–70.
- If central or heavily positive → 71–100.

Respond ONLY with a number.

Content:
${responseText}`;

      const scoreResp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: scoringPrompt
        }),
      });

      let visibilityScore = 0;
      if (scoreResp.ok) {
        const scoreJson = await scoreResp.json();
        const scoreText = scoreJson.output_text?.trim() || "0";
        visibilityScore = parseInt(scoreText) || 0;
      }

      // === Store GPT response in DB
      const { error: respInsertError } = await supabase
        .from("brand_prompt_responses")
        .insert({
          brand_prompt_id: prompt.id,
          response_text: responseText,
          model_name: "gpt-4o-mini",
          visibility_score: visibilityScore,
        });
      if (respInsertError) console.error("DB insert error:", respInsertError);

      // Update prompt with score
      await supabase
        .from("brand_prompts")
        .update({ visibility_score: visibilityScore })
        .eq("id", prompt.id);

      responses.push({
        promptId: prompt.id,
        responseText,
        visibilityScore,
      });
    }

    // === Step 3: Aggregate
    const avgVisibility = responses.length
      ? Math.round(responses.reduce((sum, r) => sum + r.visibilityScore, 0) / responses.length)
      : 0;

    return new Response(JSON.stringify({
      success: true,
      promptsGenerated: prompts.length,
      responsesGenerated: responses.length,
      averageVisibility: avgVisibility,
      responses,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in brand-analytics function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
