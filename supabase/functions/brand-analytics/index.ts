/**
 * Brand Analytics Edge Function
 * -----------------------------
 * 1. Generates 5 purchase-intent prompts per store
 * 2. Generates web-augmented responses for each prompt
 * 3. Stores responses in brand_prompt_responses
 * 4. Combines all responses → single brand visibility score
 * 5. Saves score in brand_scores table
 */

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

// Helper to safely extract text from OpenAI Responses API
function extractText(json: any): string {
  try {
    if (json?.output && Array.isArray(json.output)) {
      return json.output
        .map((o: any) => (Array.isArray(o.content) ? o.content.map((c: any) => c.text ?? "").join(" ") : ""))
        .join(" ")
        .trim();
    }
    if (typeof json?.output_text === "string") return json.output_text.trim();
  } catch (_) {}
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === 1. Auth ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) throw new Error("Unauthorized");

    // === 2. Input ===
    const { storeId } = await req.json();
    if (!storeId) throw new Error("Store ID is required");

    console.log(`▶ Brand analytics started — storeId=${storeId}`);

    // === 3. Fetch store info ===
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, user_id, name, website")
      .eq("id", storeId)
      .eq("user_id", user.id)
      .single();

    if (storeError || !store) throw new Error("Store not found or not owned by user");
    console.log(`✓ Store found: ${store.name} (${store.website})`);

    // === 4. Generate 5 purchase-intent prompts ===
    const promptGenPrompt = `
You are an AI research assistant.

Generate exactly 5 realistic search queries that a customer would type when shopping for products from ${store.website}.
Rules:
- Do NOT mention the brand "${store.name}" explicitly.
- At least one query should strongly allude to ${store.name}, without explicitly mentioning it.
- Focus on purchase-intent queries.
- Output ONLY a JSON array of strings.
`;

    const promptResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5o",
        input: promptGenPrompt,
      }),
    });

    if (!promptResp.ok) {
      const t = await promptResp.text();
      throw new Error(`Prompt generation error ${promptResp.status}: ${t}`);
    }

    const promptJson = await promptResp.json();
    const generatedText = extractText(promptJson);
    if (!generatedText) throw new Error("No prompt text returned from OpenAI");

    let prompts: string[] = [];
    try {
      const cleaned = generatedText
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      prompts = JSON.parse(cleaned);
    } catch (e) {
      console.error("Prompt parse error:", e, "Raw text:", generatedText);
      throw new Error("Failed to parse generated prompts");
    }

    console.log(`✅ Generated ${prompts.length} prompts`);

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
        })),
      )
      .select("id, content");

    if (insertError) throw new Error(`Failed to store prompts: ${insertError.message}`);
    console.log(`🧾 Stored ${insertedPrompts.length} prompts`);

    // === 5. Generate web-augmented responses and store each ===
    const responses: Array<{ promptId: string; responseText: string }> = [];

    for (const p of insertedPrompts) {
      console.log(`🌐 Generating response for promptId=${p.id}: "${p.content}"`);

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5o",
          tools: [{ type: "web_search_preview" }], // ✅ web-augmented
          input: `${p.content}\n\nProvide a comprehensive, up-to-date answer as if responding to a customer's search query. Use current web information if relevant.`,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error(`❌ OpenAI error for prompt ${p.id}:`, resp.status, txt);
        continue;
      }

      const json = await resp.json();
      const responseText = extractText(json);

      if (!responseText?.trim()) {
        console.error(`⚠️ Empty response text for prompt ${p.id}. Raw JSON:`, JSON.stringify(json, null, 2));
        continue;
      }

      const { data: insertedResponse, error: respInsertError } = await supabase
        .from("brand_prompt_responses")
        .insert({
          brand_prompt_id: p.id,
          response_text: responseText,
          model_name: "gpt-5o",
        })
        .select("id");

      if (respInsertError) {
        console.error("❌ DB insert error:", JSON.stringify(respInsertError, null, 2));
        continue;
      }

      console.log(`✓ Stored response row id=${insertedResponse?.[0]?.id ?? "unknown"}`);
      responses.push({ promptId: p.id, responseText });
    }

    // === 6. Combine all responses and compute single visibility score ===
    if (responses.length === 0) throw new Error("No responses generated; aborting score computation.");

    const combinedText = responses.map((r) => r.responseText).join("\n\n---\n\n");

    const scoringPrompt = `
Analyze the following combined customer-facing responses and assign one overall visibility score (0–100) for how prominently the brand "${store.name}" is represented across them.

Rules:
- 0 → brand absent
- 1–30 → indirect / minimal
- 31–70 → moderate or mixed presence
- 71–100 → strong, central, highly positive representation

Respond ONLY with a single number.

Content:
${combinedText}
`;

    const scoreResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5o",
        input: scoringPrompt,
      }),
    });

    let avgVisibility = 0;
    if (scoreResp.ok) {
      const scoreJson = await scoreResp.json();
      const scoreText = extractText(scoreJson);
      avgVisibility = parseInt(scoreText) || 0;
      console.log(`🎯 Overall brand visibility score: ${avgVisibility}`);
    } else {
      const err = await scoreResp.text();
      console.error("❌ Scoring API error:", err);
    }

    // === 7. Store today's brand score ===
    const today = new Date().toISOString().split("T")[0];
    const { error: brandScoreError } = await supabase.from("brand_scores").upsert(
      {
        store_id: storeId,
        date: today,
        visibility_score: avgVisibility,
      },
      { onConflict: "store_id,date" },
    );

    if (brandScoreError) console.error("Error storing brand score:", brandScoreError);

    console.log(`✅ Brand analytics completed successfully for store: ${store.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        promptsGenerated: prompts.length,
        responsesGenerated: responses.length,
        visibilityScore: avgVisibility,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error in brand-analytics function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
