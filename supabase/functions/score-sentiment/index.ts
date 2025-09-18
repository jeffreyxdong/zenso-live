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
    
    console.log(`Scoring sentiment for brand: ${brandName}`);
    console.log(`Content to analyze (first 200 chars): ${content?.substring(0, 200)}...`);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!content || !brandName) {
      console.log('Missing content or brandName - returning score 0');
      return new Response(JSON.stringify({ score: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Improved brand mention detection
    const contentLower = content.toLowerCase();
    const brandLower = brandName.toLowerCase();
    
    console.log(`Searching for brand "${brandName}" in content...`);
    console.log(`Content length: ${content.length} characters`);
    
    // Check for brand mention with multiple approaches
    const exactMatch = contentLower.includes(brandLower);
    const wordBoundaryMatch = new RegExp(`\\b${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(content);
    const partialMatch = brandLower.split(' ').some(word => word.length > 2 && contentLower.includes(word));
    
    const brandMentioned = exactMatch || wordBoundaryMatch || partialMatch;
    
    console.log(`Brand detection results - Exact: ${exactMatch}, WordBoundary: ${wordBoundaryMatch}, Partial: ${partialMatch}`);
    
    if (!brandMentioned) {
      console.log(`Brand "${brandName}" not mentioned in content - returning sentiment score 0`);
      return new Response(JSON.stringify({ score: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Brand "${brandName}" found in content - proceeding with AI scoring`);

    const scoringPrompt = `You are an expert sentiment analysis tool. The brand "${brandName}" is mentioned in this content. Analyze the sentiment towards this brand and provide a score of 1-100 where:
- 90-100: Extremely positive sentiment (highly recommended, praised, top choice)
- 70-89: Positive sentiment (recommended, good option, mentioned favorably) 
- 30-69: Neutral sentiment (mentioned factually without strong opinion)
- 10-29: Negative sentiment (not recommended, criticized, poor option)
- 1-9: Very negative sentiment (strongly criticized, warned against)

Respond with ONLY a number between 1-100, nothing else.

Content to analyze:
${content}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
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

    console.log(`Brand sentiment score: ${score}`);

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-sentiment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});