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
    const { storeId } = await req.json();
    console.log(`Scoring competitor visibility for store: ${storeId}`);

    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    if (!storeId) {
      throw new Error("Store ID is required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store details and brand name
    const { data: store, error: storeError } = await supabase.from("stores").select("name").eq("id", storeId).single();

    if (storeError) throw storeError;
    const brandName = store.name;
    console.log(`Brand name: ${brandName}`);

    // Get competitors for this store
    const { data: competitors, error: competitorsError } = await supabase
      .from("competitor_analytics")
      .select("id, name, website")
      .eq("store_id", storeId);

    if (competitorsError) throw competitorsError;

    if (!competitors || competitors.length === 0) {
      console.log("No competitors found");
      return new Response(
        JSON.stringify({
          message: "No competitors to score",
          scoresCalculated: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Found ${competitors.length} competitors to score`);

    // Get brand prompt responses ONLY for this specific store
    // This ensures we only analyze responses relevant to this brand's industry
    const { data: responses, error: responsesError } = await supabase
      .from("brand_prompt_responses")
      .select(
        `
        id,
        response_text,
        brand_prompt_id,
        brand_prompts!inner(
          store_id,
          content
        )
      `,
      )
      .eq("brand_prompts.store_id", storeId)
      .order("created_at", { ascending: false });

    if (responsesError) throw responsesError;

    if (!responses || responses.length === 0) {
      console.log("No brand prompt responses found to analyze");
      return new Response(
        JSON.stringify({
          message: "No responses to analyze for this brand",
          scoresCalculated: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Analyzing ${responses.length} responses for competitor mentions (all from brand: ${brandName})`);

    // Score each competitor
    const scoringResults = [];

    for (const competitor of competitors) {
      console.log(`\nScoring competitor: ${competitor.name}`);

      // Collect responses that mention this competitor
      const competitorMentions = responses.filter((response) => {
        const contentLower = response.response_text.toLowerCase();
        const competitorLower = competitor.name.toLowerCase();

        const exactMatch = contentLower.includes(competitorLower);
        const wordBoundaryMatch = new RegExp(
          `\\b${competitorLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(response.response_text);
        const partialMatch = competitorLower.split(" ").some((word) => word.length > 2 && contentLower.includes(word));

        return exactMatch || wordBoundaryMatch || partialMatch;
      });

      if (competitorMentions.length === 0) {
        console.log(`Competitor "${competitor.name}" not mentioned - score: 0`);
        scoringResults.push({
          competitor_id: competitor.id,
          visibility_score: 0,
        });
        continue;
      }

      console.log(`Found ${competitorMentions.length} mentions of ${competitor.name}`);

      // Calculate average visibility score across all mentions
      let totalScore = 0;
      let scoredMentions = 0;

      for (const mention of competitorMentions.slice(0, 10)) {
        const scoringPrompt = `You are an expert research analyst. The competitor "${competitor.name}" is mentioned in this AI response about ${brandName}. Provide a visibility score of 1-100 based on how prominently and visibly the competitor is featured. Consider factors like:
- Position in the content (earlier mentions score higher)
- Context of the mention (positive context, recommendations score higher)
- Frequency of mentions
- Overall prominence in the response

Respond with ONLY a number between 1-100, nothing else.

Content to analyze:
${mention.response_text}`;

        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openAIApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: scoringPrompt }],
              max_tokens: 10,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const scoreText = data.choices?.[0]?.message?.content?.trim() || "";
            const score = parseInt(scoreText) || 0;
            totalScore += score;
            scoredMentions++;
          }
        } catch (error) {
          console.error(`Error scoring mention for ${competitor.name}:`, error);
        }
      }

      const avgScore = scoredMentions > 0 ? Math.round(totalScore / scoredMentions) : 0;
      console.log(`Average visibility score for ${competitor.name}: ${avgScore}`);

      scoringResults.push({
        competitor_id: competitor.id,
        visibility_score: avgScore,
      });
    }

    // Insert/update scores in database
    const today = new Date().toISOString().split("T")[0];
    let insertedCount = 0;

    for (const result of scoringResults) {
      const { error: upsertError } = await supabase.from("competitor_scores").upsert(
        {
          competitor_id: result.competitor_id,
          store_id: storeId,
          visibility_score: result.visibility_score,
          date: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "competitor_id,date" },
      );

      if (!upsertError) {
        insertedCount++;
      } else {
        console.error(`Error upserting score for competitor ${result.competitor_id}:`, upsertError);
      }
    }

    console.log(`Successfully scored ${insertedCount} competitors`);

    return new Response(
      JSON.stringify({
        message: "Competitor scoring complete",
        scoresCalculated: insertedCount,
        results: scoringResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in score-competitor-visibility function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
