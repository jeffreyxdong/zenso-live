import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdpUrl } = await req.json();

    if (!pdpUrl) {
      throw new Error("pdpUrl is required");
    }

    console.log("Fetching content from:", pdpUrl);

    // Fetch the HTML content
    const response = await fetch(pdpUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      throw new Error("Failed to parse HTML");
    }

    // Extract title
    const titleElement = doc.querySelector("h1");
    const title = titleElement?.textContent?.trim() || 
                  doc.querySelector("title")?.textContent?.trim() || 
                  "";

    // Extract meta description
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || 
                     doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || 
                     "";

    // Extract product description from common selectors
    const descriptionSelectors = [
      '[class*="description"]',
      '[id*="description"]',
      '[class*="product-detail"]',
      '[class*="product-info"]',
      'article',
      '.content',
      '[itemprop="description"]'
    ];

    let description = "";
    for (const selector of descriptionSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        description = element.textContent?.trim() || "";
        if (description.length > 100) break;
      }
    }

    // Extract bullet points/features
    const bullets: string[] = [];
    const listItems = doc.querySelectorAll("ul li, ol li");
    listItems.forEach((li) => {
      const text = li.textContent?.trim();
      if (text && text.length > 10 && text.length < 200) {
        bullets.push(text);
      }
    });

    // Extract JSON-LD schema
    let schema = null;
    const scriptTags = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scriptTags) {
      try {
        const content = script.textContent;
        if (content) {
          const parsedSchema = JSON.parse(content);
          if (parsedSchema["@type"] === "Product" || 
              (Array.isArray(parsedSchema["@graph"]) && 
               parsedSchema["@graph"].some((item: any) => item["@type"] === "Product"))) {
            schema = parsedSchema;
            break;
          }
        }
      } catch (e) {
        console.error("Failed to parse schema:", e);
      }
    }

    // Extract images
    const images: string[] = [];
    const imgElements = doc.querySelectorAll('img[src*="product"], img[class*="product"], meta[property="og:image"]');
    imgElements.forEach((img) => {
      const src = img.getAttribute("src") || img.getAttribute("content");
      if (src && (src.startsWith("http") || src.startsWith("//"))) {
        images.push(src.startsWith("//") ? `https:${src}` : src);
      }
    });

    // Extract price if available
    let price = "";
    const priceSelectors = [
      '[itemprop="price"]',
      '[class*="price"]',
      '[id*="price"]',
      'meta[property="product:price:amount"]'
    ];
    
    for (const selector of priceSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        price = element.getAttribute("content") || 
                element.textContent?.trim() || 
                "";
        if (price) break;
      }
    }

    const extractedContent = {
      url: pdpUrl,
      title: title.substring(0, 500),
      metaDescription: metaDesc.substring(0, 1000),
      description: description.substring(0, 2000),
      bullets: bullets.slice(0, 10),
      schema,
      images: images.slice(0, 5),
      price,
      extractedAt: new Date().toISOString()
    };

    console.log("Successfully extracted content");

    return new Response(
      JSON.stringify(extractedContent),
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
