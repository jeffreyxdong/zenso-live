import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ShopifyIngestItem {
  productId: string;
  handle: string;
  title: string;
  vendor?: string;
  productType?: string;
  publishedAt?: string;
  images?: Array<{
    id: string;
    url: string;
    alt?: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    sku?: string;
    price: string;
    barcode?: string;
    qty: number;
  }>;
}

interface IngestPayload {
  shop: string;
  items: ShopifyIngestItem[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('X-Api-Key');
    const expectedApiKey = Deno.env.get('SAAS_API_KEY');
    
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: IngestPayload = await req.json();
    
    if (!payload.shop || !Array.isArray(payload.items)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${payload.items.length} products for shop: ${payload.shop}`);

    let importedCount = 0;
    let skippedCount = 0;

    // Find user by shop (you'll need to store shop mapping somewhere)
    // For now, using a placeholder - you'll need to implement shop-to-user mapping
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('company_website', payload.shop)
      .single();

    if (!profileData) {
      return new Response(
        JSON.stringify({ error: 'Shop not found or not connected' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each product
    for (const item of payload.items) {
      try {
        // Normalize product data
        const productData = {
          user_id: profileData.user_id,
          shopify_id: item.productId,
          title: item.title,
          handle: item.handle,
          status: 'active',
          product_type: item.productType || null,
          vendor: item.vendor || null,
          tags: [], // Add tags processing if needed
          images: item.images?.map(img => ({
            id: img.id,
            src: img.url,
            alt: img.alt || null,
          })) || [],
        };

        // Upsert product
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert(productData, {
            onConflict: 'user_id,shopify_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (productError) {
          console.error(`Error upserting product ${item.title}:`, productError);
          skippedCount++;
          continue;
        }

        // Process variants
        if (item.variants && item.variants.length > 0) {
          // Delete existing variants for this product
          await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', product.id);

          // Insert new variants
          const variants = item.variants.map(variant => ({
            product_id: product.id,
            shopify_variant_id: variant.id,
            title: variant.title,
            sku: variant.sku || null,
            price: parseFloat(variant.price),
            compare_at_price: null,
            inventory_quantity: variant.qty || 0,
            weight: null,
            weight_unit: 'kg',
          }));

          const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variants);

          if (variantError) {
            console.error(`Error inserting variants for ${item.title}:`, variantError);
          }
        }

        importedCount++;
      } catch (error) {
        console.error(`Error processing product ${item.title}:`, error);
        skippedCount++;
      }
    }

    console.log(`Ingest completed: ${importedCount} imported, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        ok: true,
        imported: importedCount,
        skipped: skippedCount,
        total: payload.items.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Ingest failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});