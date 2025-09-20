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
      console.log(`Brand "${brandName}" not mentioned in content - returning visibility score 0`);
      return new Response(JSON.stringify({ score: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Brand "${brandName}" found in content - proceeding with AI scoring`);

    const scoringPrompt = `You are an expert research analyst. The brand "${brandName}" is mentioned in this content. Provide a visibility score of 1-100 based on how prominently and visibly the brand is featured. Consider factors like:
- Position in the content (earlier mentions score higher)
- Context of the mention (positive context, recommendations score higher)
- Frequency of mentions
- Overall prominence in the response

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
    console.log('OpenAI API full response:', JSON.stringify(data, null, 2));
    
    const scoreText = data.choices?.[0]?.message?.content?.trim() || '';
    console.log(`Raw GPT output: "${scoreText}"`);
    
    const score = parseInt(scoreText) || 0;
    console.log(`Final visibility score: ${score}`);

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