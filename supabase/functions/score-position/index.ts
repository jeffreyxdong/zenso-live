import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function for Assistants API workflow
async function scorePositionWithAssistant(content: string, brandName: string): Promise<number> {
  // Create assistant for position scoring
  const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      instructions: `You are an expert at analyzing brand positioning in AI responses. Determine ranking position when brands appear in lists, recommendations, or comparisons.

Rules for scoring:
- If the brand appears in a numbered list, return that number (e.g., if it's #3 in a list, return 3)
- If the brand appears in an unnumbered list, count its position from the top (1st mention = 1, 2nd mention = 2, etc.)  
- If the brand is mentioned as "the best" or "top choice" without a list, return 1
- If the brand is mentioned alongside others but not in a clear ranking, estimate position based on context
- If the brand is mentioned negatively or as a poor option, return a higher number (8-10)

Respond with ONLY a number (1-10), nothing else.`,
    }),
  });

  if (!assistantResponse.ok) {
    throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
  }

  const assistant = await assistantResponse.json();

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
      content: `The brand "${brandName}" is mentioned in this content. Analyze its position:

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
      assistant_id: assistant.id,
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

    const score = await scorePositionWithAssistant(content, brandName);

    console.log(`Brand position score: ${score}`);

    return new Response(JSON.stringify({ score }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-position function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});