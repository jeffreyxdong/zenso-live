import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand } = await req.json();
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Craft search query to find official product page
    const searchQuery = brand 
      ? `official product page for ${brand} ${productName} -amazon -ebay -walmart -aliexpress -review`
      : `official product page for ${productName} -amazon -ebay -walmart -aliexpress -review`;

    console.log("Searching for:", searchQuery);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to search for product page" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const pdpUrl = data.choices?.[0]?.message?.content?.trim();

    if (!pdpUrl) {
      return new Response(
        JSON.stringify({ error: "No product page found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    let validUrl: string;
    try {
      const urlObj = new URL(pdpUrl);
      validUrl = urlObj.href;
    } catch {
      // If not a valid URL, try extracting from text
      const urlMatch = pdpUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        validUrl = urlMatch[0];
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid URL found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Found PDP:", validUrl);

    return new Response(
      JSON.stringify({ pdpUrl: validUrl }),
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
