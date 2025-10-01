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
    const { productId } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY || !PERPLEXITY_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Fetching product:", productId);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("title, vendor, handle")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    console.log("Product found:", product.title);

    // Step 1: Find PDP using Perplexity
    const searchQuery = product.vendor 
      ? `official product page for ${product.vendor} ${product.title} -amazon -ebay -walmart -aliexpress -review`
      : `official product page for ${product.title} -amazon -ebay -walmart -aliexpress -review`;

    console.log("Searching for PDP with query:", searchQuery);

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are a web search assistant. Find the official product page URL (manufacturer's website or official brand store) for the given product. Return ONLY the URL, nothing else. Exclude marketplaces like Amazon, eBay, Walmart, AliExpress, and review sites."
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error("Perplexity API error:", perplexityResponse.status, errorText);
      throw new Error("Failed to find product page");
    }

    const perplexityData = await perplexityResponse.json();
    let pdpUrl = perplexityData.choices?.[0]?.message?.content?.trim();

    if (!pdpUrl) {
      console.log("No PDP found, skipping recommendations");
      return new Response(
        JSON.stringify({ success: false, message: "No PDP found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and clean URL
    try {
      const urlMatch = pdpUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        pdpUrl = urlMatch[0];
      }
      new URL(pdpUrl); // Validate URL
    } catch {
      console.log("Invalid URL found:", pdpUrl);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid URL found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found PDP:", pdpUrl);

    // Step 2: Fetch PDP content
    console.log("Fetching PDP content from:", pdpUrl);

    const pdpResponse = await fetch(pdpUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!pdpResponse.ok) {
      throw new Error(`Failed to fetch PDP: ${pdpResponse.status}`);
    }

    const html = await pdpResponse.text();
    
    // Simple extraction (basic parsing)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta name="description" content="(.*?)"/i);
    
    const pdpTitle = titleMatch?.[1] || product.title;
    const pdpDescription = descMatch?.[1] || "";

    console.log("Extracted PDP title:", pdpTitle);

    // Step 3: Generate recommendations with GPT
    const prompt = `Analyze this product page information and provide 3-5 actionable recommendations to increase GEO (Generative Engine Optimization) visibility. Focus on what would make this product more discoverable and recommended by AI assistants like ChatGPT, Claude, Gemini, and Perplexity.

Product: ${product.title}
Brand: ${product.vendor || "Unknown"}
Product Page URL: ${pdpUrl}
Page Title: ${pdpTitle}
Meta Description: ${pdpDescription}

Provide specific, actionable recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "title": "Short recommendation title",
      "description": "Detailed explanation of what to do and why",
      "category": "content|schema|technical|branding",
      "impact": "high|medium|low",
      "effort": "high|medium|low"
    }
  ]
}`;

    console.log("Generating recommendations with GPT");

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a GEO (Generative Engine Optimization) expert. Provide recommendations in valid JSON format only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("GPT API error:", gptResponse.status, errorText);
      throw new Error("Failed to generate recommendations");
    }

    const gptData = await gptResponse.json();
    const recommendationsText = gptData.choices[0].message.content;

    console.log("GPT response:", recommendationsText);

    // Parse recommendations
    let recommendations;
    try {
      const jsonMatch = recommendationsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        recommendations = JSON.parse(recommendationsText);
      }
    } catch (e) {
      console.error("Failed to parse recommendations:", e);
      throw new Error("Invalid recommendations format");
    }

    // Store recommendations in database
    const { error: insertError } = await supabase
      .from("product_recommendations")
      .insert(
        recommendations.recommendations.map((rec: any) => ({
          product_id: productId,
          title: rec.title,
          description: rec.description,
          category: rec.category,
          impact: rec.impact,
          effort: rec.effort,
          pdp_url: pdpUrl,
          status: "pending"
        }))
      );

    if (insertError) {
      console.error("Error storing recommendations:", insertError);
      throw insertError;
    }

    console.log("Successfully stored recommendations");

    return new Response(
      JSON.stringify({
        success: true,
        pdpUrl,
        recommendationsCount: recommendations.recommendations.length
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
