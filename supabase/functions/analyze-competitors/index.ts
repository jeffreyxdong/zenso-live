import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId } = await req.json();
    
    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'Store ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('name, website')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.error('Failed to fetch store:', storeError);
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name: brandName, website } = store;
    console.log('Analyzing competitors for store:', brandName);

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Identify the top 5 direct competitors for ${brandName}${website ? ` (${website})` : ''} in the SAME industry and product category.${productContext}

IMPORTANT: The competitors MUST be in the exact same industry and sell similar products. Do not suggest competitors from different industries.

For each competitor, provide:
1. Company name
2. Website URL
3. Brief description (1 sentence)
4. Market positioning (economy/mid-range/premium)
5. Key differentiator

Format the response as a JSON array with objects containing: name, website, description, marketPosition, keyDifferentiator`;

    console.log('Calling Perplexity API for brand:', brandName);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst. Provide accurate, current competitor information in the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Perplexity API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('No content in Perplexity response');
      return new Response(
        JSON.stringify({ error: 'No content received from Perplexity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON from markdown code blocks if present
    let competitors;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      competitors = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', parseError);
      console.log('Raw content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse competitor data', rawContent: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${competitors?.length || 0} competitors for ${brandName}`);

    // Delete existing competitors for this store
    const { error: deleteError } = await supabase
      .from('competitor_analytics')
      .delete()
      .eq('store_id', storeId);

    if (deleteError) {
      console.error('Error deleting old competitors:', deleteError);
    }

    // Insert new competitors
    if (competitors && competitors.length > 0) {
      const competitorRecords = competitors.map((comp: any) => ({
        store_id: storeId,
        name: comp.name,
        website: comp.website || null,
        description: comp.description,
        market_position: comp.marketPosition,
        key_differentiator: comp.keyDifferentiator || null,
      }));

      const { error: insertError } = await supabase
        .from('competitor_analytics')
        .insert(competitorRecords);

      if (insertError) {
        console.error('Error inserting competitors:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store competitor data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Stored ${competitorRecords.length} competitors for store ${storeId}`);
    }

    return new Response(
      JSON.stringify({ success: true, count: competitors?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-competitors function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
