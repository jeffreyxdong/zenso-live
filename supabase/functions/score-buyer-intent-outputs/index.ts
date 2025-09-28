import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
    const { productId, productTitle } = await req.json();

    if (!productId || !productTitle) {
      return new Response(JSON.stringify({ error: 'Product ID and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calculating scores for product:', productTitle);

    // Get user ID from the request headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('Invalid user token');
    }

    // Fetch all responses for the product
    const { data: responses, error: responsesError } = await supabase
      .from('prompt_responses')
      .select(`
        *,
        prompts!inner(
          product_id,
          user_id
        )
      `)
      .eq('prompts.product_id', productId)
      .eq('prompts.user_id', userData.user.id);

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No responses found for this product',
        scores: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${responses.length} responses to analyze`);

    const allResponsesText = responses.map(r => r.response_text).join('\n\n');

    // Create assistant for scoring
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        name: 'Advanced Brand Performance Analyst',
        instructions: `You are an expert AI research analyst specializing in brand visibility and performance measurement in AI-generated content. Your analysis determines how effectively a brand appears in AI responses to buyer-intent queries.

ANALYSIS FRAMEWORK:
You will perform three distinct scoring analyses and return results as a JSON object.

🔍 STEP 1 - VISIBILITY SCORE (0-100):
Measures overall brand presence and prominence in the responses.

Scoring Criteria:
• 90-100: Brand mentioned prominently multiple times, clear focus
• 75-89: Brand mentioned clearly with good context  
• 60-74: Brand mentioned adequately but not prominently
• 40-59: Brand mentioned briefly or in passing
• 20-39: Brand barely mentioned or unclear references
• 0-19: Brand not mentioned or only indirect references

📍 STEP 2 - POSITION SCORE (0-100):
Analyzes WHERE the brand appears in the text and weights early mentions heavily.

Advanced Positioning Algorithm:
1. Map all brand mentions to text position percentiles
2. Apply exponential weighting: First 10% = 100% weight, 11-25% = 80% weight, 26-50% = 60% weight, 51-75% = 40% weight, 76-100% = 20% weight
3. Calculate mention density and distribution patterns
4. Factor in mention context (headline vs body vs conclusion)
5. Apply diminishing returns for multiple mentions in same section
6. Normalize to 0-100 scale

💭 STEP 3 - SENTIMENT SCORE (0-100):
Evaluates the emotional tone and favorability of brand mentions.

Advanced Sentiment Analysis:
• 95-100: Exceptional praise, superlatives, "best choice" language
• 85-94: Strong positive endorsement, clear recommendation
• 70-84: Positive mention with good attributes highlighted
• 55-69: Neutral positive, factual but favorable presentation
• 40-54: Neutral descriptive, balanced pros/cons
• 25-39: Neutral negative, some concerns mentioned
• 10-24: Negative sentiment, problems or limitations highlighted
• 0-9: Very negative, critical or dismissive tone

CRITICAL ANALYSIS FACTORS:
- Weight sentiment near first mentions 2x higher
- Consider competitive context and comparative language
- Evaluate call-to-action strength and purchase encouragement
- Assess trustworthiness indicators and authority language

OUTPUT REQUIREMENTS:
Return ONLY a clean JSON object. No markdown, explanations, or additional text.

{
  "visibility_score": 85,
  "position_score": 72,  
  "sentiment_score": 91
}`,
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
    const messageContent = `Analyze brand mentions for "${productTitle}" in these responses:

${allResponsesText}`;

    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent,
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
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      
      const statusData = await statusResponse.json();
      runStatus = statusData.status;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const messagesData = await messagesResponse.json();
    const scoresText = messagesData.data[0].content[0].text.value.trim();
    
    try {
      // Parse the JSON response
      let cleanedScores = scoresText;
      if (cleanedScores.startsWith('```json')) {
        cleanedScores = cleanedScores.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanedScores.startsWith('```')) {
        cleanedScores = cleanedScores.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const scores = JSON.parse(cleanedScores);
      const visibilityScore = parseInt(scores.visibility_score) || 0;
      const positionScore = parseInt(scores.position_score) || 0;
      const sentimentScore = parseInt(scores.sentiment_score) || 0;

      console.log(`Calculated scores for product: ${productTitle}`);
      console.log(`Visibility: ${visibilityScore}, Position: ${positionScore}, Sentiment: ${sentimentScore}`);

      // Insert scores into product_scores table
      const { data: insertedScore, error: scoreError } = await supabase
        .from('product_scores')
        .insert({
          product_id: productId,
          visibility_score: visibilityScore,
          position_score: positionScore,
          sentiment_score: sentimentScore
        })
        .select()
        .single();

      if (scoreError) {
        console.error('Failed to insert product scores:', scoreError);
        throw new Error(`Failed to save scores: ${scoreError.message}`);
      }

      console.log(`Inserted scores for product ${productId} into product_scores table`);

      return new Response(JSON.stringify({ 
        success: true, 
        scores: {
          visibility_score: visibilityScore,
          position_score: positionScore,
          sentiment_score: sentimentScore
        },
        scoreId: insertedScore.id,
        message: 'Product scores calculated and saved successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse scoring response:', scoresText);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse scoring response');
    }
  } catch (error) {
    console.error('Error in score-buyer-intent-outputs function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});