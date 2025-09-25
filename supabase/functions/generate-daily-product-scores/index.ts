import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting daily product scores generation...');

    // Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, created_at')
      .eq('status', 'active');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products', details: productsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      console.log('No active products found');
      return new Response(
        JSON.stringify({ message: 'No active products found', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${products.length} active products`);

    let processedCount = 0;
    const today = new Date().toDateString();

    // Process each product
    for (const product of products) {
      try {
        // Check if we already have a score for today
        const { data: existingScore } = await supabase
          .from('product_scores')
          .select('id')
          .eq('product_id', product.id)
          .gte('created_at', new Date().toISOString().split('T')[0])
          .single();

        if (existingScore) {
          console.log(`Score already exists for product ${product.id} today`);
          continue;
        }

        // Generate realistic but random scores
        // Visibility: 1-100 (trending towards higher for newer products)
        const visibilityScore = Math.floor(Math.random() * 80) + 20;
        
        // Sentiment: 1-10 (trending towards positive)
        const sentimentScore = Math.floor(Math.random() * 6) + 5;
        
        // Position: 1-20 (lower is better, trending towards middle range)
        const positionScore = Math.floor(Math.random() * 15) + 3;

        // Insert the new score
        const { error: insertError } = await supabase
          .from('product_scores')
          .insert({
            product_id: product.id,
            visibility_score: visibilityScore,
            sentiment_score: sentimentScore,
            position_score: positionScore
          });

        if (insertError) {
          console.error(`Error inserting score for product ${product.id}:`, insertError);
        } else {
          console.log(`Generated scores for product ${product.id}: V:${visibilityScore}, S:${sentimentScore}, P:${positionScore}`);
          processedCount++;
        }

      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
      }
    }

    console.log(`Completed processing. Generated scores for ${processedCount} products.`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: products.length,
        message: `Generated daily scores for ${processedCount} products`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Daily score generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Score generation failed', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});