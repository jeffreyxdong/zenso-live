import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { siteUrl } = await req.json();

    if (!siteUrl) {
      return new Response(
        JSON.stringify({ error: "siteUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching content from:", siteUrl);

    // Fetch the HTML content
    const response = await fetch(siteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GEObot/1.0; +https://geo-optimizer.com/bot)',
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch URL:", response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch content: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      return new Response(
        JSON.stringify({ error: "Failed to parse HTML" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract key information
    const title = doc.querySelector("h1")?.textContent?.trim() || 
                  doc.querySelector("title")?.textContent?.trim() || 
                  "";

    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
                            doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
                            "";

    // Extract main content
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.main-content',
      'body'
    ];

    let mainContent = "";
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        mainContent = element.textContent?.trim() || "";
        if (mainContent.length > 500) break;
      }
    }

    // Extract navigation/menu items
    const navItems: string[] = [];
    doc.querySelectorAll('nav a, header a, [role="navigation"] a').forEach(link => {
      const text = link.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        navItems.push(text);
      }
    });

    // Extract headings
    const headings: string[] = [];
    ['h1', 'h2', 'h3'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(heading => {
        const text = heading.textContent?.trim();
        if (text && text.length > 0) {
          headings.push(text);
        }
      });
    });

    // Extract schema.org data
    const schemas: any[] = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent || "");
        schemas.push(data);
      } catch {
        // Ignore parse errors
      }
    });

    // Extract images
    const images: string[] = [];
    doc.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        try {
          const imgUrl = new URL(src, siteUrl).href;
          images.push(imgUrl);
        } catch {
          // Skip invalid URLs
        }
      }
    });

    // Get og:image
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImage) {
      try {
        images.unshift(new URL(ogImage, siteUrl).href);
      } catch {
        // Skip invalid URLs
      }
    }

    const content = {
      title,
      metaDescription,
      mainContent: mainContent.slice(0, 5000), // Limit to 5000 chars
      navItems: navItems.slice(0, 20),
      headings: headings.slice(0, 30),
      schemas,
      images: images.slice(0, 10),
      url: siteUrl,
    };

    console.log("Extracted content summary:", {
      title,
      mainContentLength: mainContent.length,
      navItemsCount: navItems.length,
      headingsCount: headings.length,
      schemasCount: schemas.length,
      imagesCount: images.length,
    });

    return new Response(
      JSON.stringify(content),
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
