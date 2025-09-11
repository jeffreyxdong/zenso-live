import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyOAuthParams {
  shop?: string;
  code?: string;
  state?: string;
  action?: 'exchange-and-import' | 'get-api-key';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth client to verify JWT and get user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ShopifyOAuthParams = await req.json();
    const { shop, code, state, action } = body;

    const SHOPIFY_API_KEY = Deno.env.get('SHOPIFY_API_KEY');
    const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET');

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Shopify credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-api-key') {
      // Simple endpoint to get the API key for the frontend
      return new Response(
        JSON.stringify({ apiKey: SHOPIFY_API_KEY }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange-and-import' && code && shop) {
      console.log(`Processing OAuth callback for shop: ${shop}`);
      
      // Step 1: Exchange code for access token
      const tokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`;
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code: code,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
      }

      console.log(`Successfully obtained access token for shop: ${shop}`);

      // Step 2: Fetch products from Shopify
      const productsUrl = `https://${shop}.myshopify.com/admin/api/2023-10/products.json?limit=250`;
      
      const productsResponse = await fetch(productsUrl, {
        headers: {
          'X-Shopify-Access-Token': tokenData.access_token,
          'Content-Type': 'application/json',
        },
      });

      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status} ${await productsResponse.text()}`);
      }

      const productsData = await productsResponse.json();
      console.log(`Fetched ${productsData.products?.length || 0} products from Shopify`);
      
      // Step 3: Transform products for the shopify-ingest function
      const transformedProducts = productsData.products.map((product: any) => ({
        productId: product.id.toString(),
        title: product.title,
        handle: product.handle,
        status: product.status,
        productType: product.product_type,
        vendor: product.vendor,
        images: product.images.map((img: any) => ({
          id: img.id.toString(),
          url: img.src,
          alt: img.alt,
        })),
        variants: product.variants.map((variant: any) => ({
          id: variant.id.toString(),
          title: variant.title,
          sku: variant.sku,
          price: variant.price,
          inventory_quantity: variant.inventory_quantity,
          weight: variant.weight,
          weight_unit: variant.weight_unit,
        })),
      }));

      // Step 4: Call the existing shopify-ingest function
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: ingestResult, error: ingestError } = await supabaseAdmin.functions.invoke(
        'shopify-ingest',
        {
          body: {
            shop,
            items: transformedProducts,
          },
          headers: {
            Authorization: authHeader,
          },
        }
      );

      if (ingestError) {
        console.error('Ingest error:', ingestError);
        throw new Error(`Failed to ingest products: ${ingestError.message}`);
      }

      console.log(`Successfully imported ${ingestResult.imported} products, skipped ${ingestResult.skipped}`);

      return new Response(
        JSON.stringify({
          success: true,
          imported: ingestResult.imported,
          skipped: ingestResult.skipped,
          total: ingestResult.total,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing parameters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Shopify OAuth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});