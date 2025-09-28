import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reuse existing assistant ID for sentiment scoring
const SENTIMENT_ASSISTANT_ID = 'asst_sentiment_scorer_001'; // You would create this once and store the real ID

// Helper function for Assistants API workflow
async function scoreSentimentWithAssistant(content: string, brandName: string): Promise<number> {
  // Use existing assistant ID instead of creating new one

  // Create thread
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({}),
  });

  if (!threadResponse.ok) {
    throw new Error(`Failed to create thread: ${threadResponse.status}`);
  }

  const thread = await threadResponse.json();

  // Add message to thread
  await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      role: 'user',
      content: `The brand "${brandName}" is mentioned in this content. Analyze the sentiment:

${content}`,
    }),
  });

  // Start run
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      assistant_id: SENTIMENT_ASSISTANT_ID,
    }),
  });

  if (!runResponse.ok) {
    throw new Error(`Failed to start run: ${runResponse.status}`);
  }

  const run = await runResponse.json();

  // Poll for completion
  let runStatus = run;
  while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check run status: ${statusResponse.status}`);
    }

    runStatus = await statusResponse.json();
  }

  if (runStatus.status === 'failed') {
    throw new Error(`Run failed: ${runStatus.last_error?.message}`);
  }

  // Get messages
  const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });

  if (!messagesResponse.ok) {
    throw new Error(`Failed to get messages: ${messagesResponse.status}`);
  }

  const messages = await messagesResponse.json();
  const lastMessage = messages.data[0];
  const scoreText = lastMessage.content[0].text.value.trim();
  
  return parseInt(scoreText) || 0;
}

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
    const partialMatch = brandLower.split(' ').some((word: string) => word.length > 2 && contentLower.includes(word));
    
    const brandMentioned = exactMatch || wordBoundaryMatch || partialMatch;
    
    console.log(`Brand detection results - Exact: ${exactMatch}, WordBoundary: ${wordBoundaryMatch}, Partial: ${partialMatch}`);
    
    if (!brandMentioned) {
      console.log(`Brand "${brandName}" not mentioned in content - returning sentiment score 0`);
      return new Response(JSON.stringify({ score: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Brand "${brandName}" found in content - proceeding with AI scoring`);

    const score = await scoreSentimentWithAssistant(content, brandName);
    console.log(`Final sentiment score: ${score}`);

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-sentiment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});