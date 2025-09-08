import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  images: {
    edges: Array<{
      node: {
        id: string;
        src: string;
        altText?: string;
      }
    }>
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string;
        price: string;
        compareAtPrice?: string;
        inventoryQuantity: number;
        weight?: number;
        weightUnit?: string;
      }
    }>
  };
}

interface ShopifyResponse {
  data: {
    products: {
      edges: Array<{
        node: ShopifyProduct;
        cursor: string;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor?: string;
      };
    }
  };
}

const SHOPIFY_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      edges {
        node {
          id
          title
          handle
          status
          productType
          vendor
          tags
          images(first: 10) {
            edges {
              node {
                id
                src
                altText
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
                weight
                weightUnit
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

async function fetchShopifyProducts(
  storeName: string,
  accessToken: string,
  cursor?: string
): Promise<ShopifyResponse> {
  const url = `https://${storeName}.myshopify.com/admin/api/2024-01/graphql.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      query: SHOPIFY_PRODUCTS_QUERY,
      variables: {
        first: 50,
        after: cursor,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

function normalizeShopifyProduct(shopifyProduct: ShopifyProduct) {
  return {
    shopify_id: shopifyProduct.id,
    title: shopifyProduct.title,
    handle: shopifyProduct.handle,
    status: shopifyProduct.status.toLowerCase(),
    product_type: shopifyProduct.productType || null,
    vendor: shopifyProduct.vendor || null,
    tags: shopifyProduct.tags || [],
    images: shopifyProduct.images.edges.map(edge => ({
      id: edge.node.id,
      src: edge.node.src,
      alt: edge.node.altText || null,
    })),
  };
}

function normalizeShopifyVariant(shopifyVariant: any, productId: string) {
  return {
    product_id: productId,
    shopify_variant_id: shopifyVariant.id,
    title: shopifyVariant.title,
    sku: shopifyVariant.sku || null,
    price: parseFloat(shopifyVariant.price),
    compare_at_price: shopifyVariant.compareAtPrice ? parseFloat(shopifyVariant.compareAtPrice) : null,
    inventory_quantity: shopifyVariant.inventoryQuantity || 0,
    weight: shopifyVariant.weight || null,
    weight_unit: shopifyVariant.weightUnit || 'kg',
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { shopifyStoreName, accessToken } = await req.json();

    if (!shopifyStoreName || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: shopifyStoreName and accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting product import for store: ${shopifyStoreName}`);

    let allProducts: ShopifyProduct[] = [];
    let hasNextPage = true;
    let cursor: string | undefined;
    let pageCount = 0;

    // Fetch all products using pagination
    while (hasNextPage && pageCount < 20) { // Limit to 20 pages for safety (1000 products max)
      console.log(`Fetching page ${pageCount + 1}${cursor ? ` (cursor: ${cursor})` : ''}`);
      
      const shopifyResponse = await fetchShopifyProducts(shopifyStoreName, accessToken, cursor);
      
      const products = shopifyResponse.data.products.edges.map(edge => edge.node);
      allProducts.push(...products);
      
      hasNextPage = shopifyResponse.data.products.pageInfo.hasNextPage;
      cursor = shopifyResponse.data.products.pageInfo.endCursor;
      pageCount++;
      
      console.log(`Fetched ${products.length} products (total: ${allProducts.length})`);
    }

    console.log(`Total products fetched: ${allProducts.length}`);

    let importedCount = 0;
    let skippedCount = 0;

    // Process each product
    for (const shopifyProduct of allProducts) {
      try {
        // Normalize product data
        const normalizedProduct = normalizeShopifyProduct(shopifyProduct);

        // Insert or update product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .upsert({
            user_id: user.id,
            ...normalizedProduct,
          }, {
            onConflict: 'user_id,shopify_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (productError) {
          console.error(`Error inserting product ${shopifyProduct.title}:`, productError);
          skippedCount++;
          continue;
        }

        // Process variants
        if (shopifyProduct.variants.edges.length > 0) {
          const variants = shopifyProduct.variants.edges.map(edge => 
            normalizeShopifyVariant(edge.node, productData.id)
          );

          // Delete existing variants for this product
          await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', productData.id);

          // Insert new variants
          const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variants);

          if (variantError) {
            console.error(`Error inserting variants for ${shopifyProduct.title}:`, variantError);
          }
        }

        importedCount++;
      } catch (error) {
        console.error(`Error processing product ${shopifyProduct.title}:`, error);
        skippedCount++;
      }
    }

    console.log(`Import completed: ${importedCount} imported, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProducts: allProducts.length,
        imported: importedCount,
        skipped: skippedCount,
        message: `Successfully imported ${importedCount} products from Shopify`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Import failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});