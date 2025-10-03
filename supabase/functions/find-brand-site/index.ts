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
    const { brandName, website } = await req.json();
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // If we already have a website URL, validate and return it
    if (website && website.trim()) {
      try {
        const urlObj = new URL(website);
        console.log("Using provided website:", urlObj.href);
        return new Response(
          JSON.stringify({ siteUrl: urlObj.href }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (urlError) {
        console.error("Invalid website URL provided:", website);
      }
    }

    // Otherwise search for the brand's official website
    const searchQuery = `official website for ${brandName} brand`;
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
            content: "You are a web search assistant. Find the official website URL for the given brand. Return ONLY the URL, nothing else."
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
        JSON.stringify({ error: "Failed to search for brand website" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const siteUrl = data.choices?.[0]?.message?.content?.trim();

    if (!siteUrl) {
      return new Response(
        JSON.stringify({ error: "No brand website found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    let validUrl: string;
    try {
      const urlObj = new URL(siteUrl);
      validUrl = urlObj.href;
    } catch {
      // If not a valid URL, try extracting from text
      const urlMatch = siteUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        validUrl = urlMatch[0];
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid URL found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Found brand site:", validUrl);

    return new Response(
      JSON.stringify({ siteUrl: validUrl }),
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
