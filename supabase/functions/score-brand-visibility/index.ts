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
    
    console.log(`Scoring brand visibility for: ${brandName}`);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const scoringPrompt = `You are an expert research analyst. Given a prompt output, provide a score of 1-100 based on how visible the brand "${brandName}" is within the prompt output. Factor in the position in which the brand is mentioned, and if it isn't mentioned at all, give a score of 0. 

Respond with ONLY a number between 0-100, nothing else.

Content to analyze:
${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'user', content: scoringPrompt }
        ],
        max_completion_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    const score = parseInt(scoreText) || 0;

    console.log(`Brand visibility score: ${score}`);

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-brand-visibility function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});