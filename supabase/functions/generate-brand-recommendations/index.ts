import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    
    if (!storeId) {
      return new Response(
        JSON.stringify({ error: "storeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      throw new Error("Store not found");
    }

    console.log("Generating recommendations for store:", store.name);

    // Find brand site URL
    const findSiteResponse = await fetch(`${SUPABASE_URL}/functions/v1/find-brand-site`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        brandName: store.name,
        website: store.website,
      }),
    });

    if (!findSiteResponse.ok) {
      const error = await findSiteResponse.json();
      throw new Error(`Failed to find brand site: ${error.error}`);
    }

    const { siteUrl } = await findSiteResponse.json();
    console.log("Brand site URL:", siteUrl);

    // Fetch brand content
    const fetchContentResponse = await fetch(`${SUPABASE_URL}/functions/v1/fetch-brand-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ siteUrl }),
    });

    if (!fetchContentResponse.ok) {
      const error = await fetchContentResponse.json();
      throw new Error(`Failed to fetch brand content: ${error.error}`);
    }

    const brandContent = await fetchContentResponse.json();
    console.log("Fetched brand content");

    // Generate recommendations using OpenAI
    const prompt = `You are a GEO (Generative Engine Optimization) expert analyzing a brand's website to improve its visibility in AI-powered search results and recommendations.

Brand: ${store.name}
Website: ${siteUrl}

Website Content Analysis:
- Page Title: ${brandContent.title}
- Meta Description: ${brandContent.metaDescription}
- Main Headings: ${brandContent.headings.slice(0, 10).join(", ")}
- Navigation Items: ${brandContent.navItems.join(", ")}
- Content Preview: ${brandContent.mainContent.slice(0, 2000)}

Conduct a comprehensive site audit and provide 5-8 specific, actionable recommendations to improve this brand's visibility in AI-powered search engines (ChatGPT, Claude, Perplexity, Gemini, etc.).

Focus on:
1. Content structure and clarity for AI comprehension
2. Strategic keyword placement and semantic relevance
3. Schema markup and structured data optimization
4. Brand authority and trust signals
5. Content gaps and opportunities
6. Technical SEO for AI crawlers
7. Entity recognition and relationships
8. Question-answering optimization

Return your recommendations as a JSON array with this exact structure:
[
  {
    "title": "Brief title (max 80 chars)",
    "description": "Detailed explanation with specific examples (max 300 chars)",
    "category": "content|technical|schema|authority|keywords",
    "impact": "high|medium|low",
    "effort": "low|medium|high"
  }
]

Ensure each recommendation is specific to this brand and website, not generic advice.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a GEO optimization expert. Always respond with valid JSON arrays only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorText);
      throw new Error("Failed to generate recommendations");
    }

    const openaiData = await openaiResponse.json();
    const recommendationsText = openaiData.choices[0].message.content;

    console.log("OpenAI response:", recommendationsText);

    // Parse recommendations
    let recommendations;
    try {
      // Try to extract JSON array from the response
      const jsonMatch = recommendationsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        recommendations = JSON.parse(recommendationsText);
      }
    } catch (parseError) {
      console.error("Failed to parse recommendations:", parseError);
      throw new Error("Failed to parse AI recommendations");
    }

    // Store recommendations in database
    const recommendationsToInsert = recommendations.map((rec: any) => ({
      store_id: storeId,
      title: rec.title,
      description: rec.description,
      category: rec.category,
      impact: rec.impact,
      effort: rec.effort,
      site_url: siteUrl,
      status: "pending",
    }));

    const { error: insertError } = await supabase
      .from("brand_recommendations")
      .insert(recommendationsToInsert);

    if (insertError) {
      console.error("Failed to store recommendations:", insertError);
      throw new Error("Failed to store recommendations");
    }

    console.log(`Generated and stored ${recommendations.length} recommendations`);

    return new Response(
      JSON.stringify({
        success: true,
        siteUrl,
        recommendationsCount: recommendations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
