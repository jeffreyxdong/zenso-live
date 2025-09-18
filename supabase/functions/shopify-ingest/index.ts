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
  shop?: string;
  items?: ShopifyIngestItem[];
  products?: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate and extract SaaS user from Supabase JWT
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: IngestPayload = await req.json();
    
    const items: any[] = Array.isArray(body.items)
      ? (body.items as any[])
      : Array.isArray(body.products)
        ? (body.products as any[])
        : [];

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${items.length} products for user: ${user.id}`);

    // Get the user's active store
    const { data: activeStore, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (storeError || !activeStore) {
      return new Response(
        JSON.stringify({ error: 'No active store found. Please ensure you have an active store set up.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using active store: ${activeStore.id}`);

    let importedCount = 0;
    let skippedCount = 0;

    const userId = user.id;

    // Process each product
    for (const item of items) {
      try {
        // Normalize product data
        const productData = {
          user_id: userId,
          store_id: activeStore.id,
          shopify_id: String((item as any).productId ?? (item as any).id),
          title: item.title,
          handle: item.handle || (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `product-${(item as any).productId ?? (item as any).id}`),
          status: 'active',
          product_type: (item as any).productType || (item as any).product_type || null,
          vendor: item.vendor || null,
          tags: Array.isArray((item as any).tags) ? (item as any).tags : [],
          images: (Array.isArray((item as any).images) ? (item as any).images : []).map((img: any) => ({
            id: String(img.id ?? ''),
            src: img.src ?? img.url,
            alt: img.alt ?? null,
          })),
        };

        // Upsert product
        const { data: product, error: productError } = await supabaseAdmin
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
        const itemVariants = (item as any).variants;
        if (Array.isArray(itemVariants) && itemVariants.length > 0) {
          // Delete existing variants for this product
          await supabaseAdmin
            .from('product_variants')
            .delete()
            .eq('product_id', product.id);

          // Insert new variants
          const variants = itemVariants.map((variant: any) => ({
            product_id: product.id,
            shopify_variant_id: String(variant.id),
            title: variant.title ?? 'Default',
            sku: variant.sku ?? null,
            price: parseFloat(String(variant.price ?? 0)),
            compare_at_price: null,
            inventory_quantity: Number(variant.inventory_quantity ?? variant.qty ?? 0),
            weight: variant.weight ? Number(variant.weight) : null,
            weight_unit: (variant.weight_unit ?? 'kg') as string,
          }));

          const { error: variantError } = await supabaseAdmin
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
        total: items.length
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