import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, brandName } = await req.json();
    
    console.log(`Scoring position for brand: ${brandName}`);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // First check if brand is mentioned at all
    const brandMentioned = content.toLowerCase().includes(brandName.toLowerCase());
    
    if (!brandMentioned) {
      console.log(`Brand "${brandName}" not mentioned in content - returning position score 0`);
      return new Response(JSON.stringify({ score: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scoringPrompt = `You are an expert at analyzing brand positioning in AI responses. The brand "${brandName}" is mentioned in this content. Determine its ranking position when it appears in lists, recommendations, or comparisons.

Rules for scoring:
- If the brand appears in a numbered list, return that number (e.g., if it's #3 in a list, return 3)
- If the brand appears in an unnumbered list, count its position from the top (1st mention = 1, 2nd mention = 2, etc.)  
- If the brand is mentioned as "the best" or "top choice" without a list, return 1
- If the brand is mentioned alongside others but not in a clear ranking, estimate position based on context
- If the brand is mentioned negatively or as a poor option, return a higher number (8-10)

Respond with ONLY a number (1-10), nothing else.

Content to analyze:
${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: scoringPrompt }
        ],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    const score = parseInt(scoreText) || 0;

    console.log(`Brand position score: ${score}`);

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-position function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});