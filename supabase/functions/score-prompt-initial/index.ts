import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promptId, content, brandName } = await req.json();
    
    console.log(`Initial scoring for prompt ${promptId} with brand: ${brandName}`);

    if (!promptId || !content || !brandName) {
      throw new Error('Missing required parameters: promptId, content, or brandName');
    }

    // Score both visibility and sentiment using the existing edge functions
    const [visibilityResult, sentimentResult] = await Promise.allSettled([
      fetch(`${supabaseUrl}/functions/v1/score-brand-visibility`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          brandName: brandName
        }),
      }).then(res => res.json()),
      
      fetch(`${supabaseUrl}/functions/v1/score-brand-sentiment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          brandName: brandName
        }),
      }).then(res => res.json())
    ]);

    console.log('Initial visibility result:', visibilityResult);
    console.log('Initial sentiment result:', sentimentResult);

    const visibilityScore = visibilityResult.status === 'fulfilled' ? visibilityResult.value?.score || 0 : 0;
    const sentimentScore = sentimentResult.status === 'fulfilled' ? sentimentResult.value?.score || 0 : 0;

    console.log(`Initial scores - Visibility: ${visibilityScore}, Sentiment: ${sentimentScore}`);

    // Update the prompt with the initial scores
    await supabase
      .from('prompts')
      .update({
        visibility_score: visibilityScore,
        sentiment_score: sentimentScore
      })
      .eq('id', promptId);

    // Create the first daily score entry
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    await supabase
      .from('prompt_daily_scores')
      .insert({
        prompt_id: promptId,
        date: today,
        visibility_score: visibilityScore,
        sentiment_score: sentimentScore
      });

    console.log(`Created initial daily score entry for prompt ${promptId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        visibility_score: visibilityScore,
        sentiment_score: sentimentScore 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in initial prompt scoring:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});