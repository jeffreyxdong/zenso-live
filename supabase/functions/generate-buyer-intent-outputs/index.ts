import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const assistantId = Deno.env.get('ASSISTANT_ID');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    if (!assistantId) {
      throw new Error('ASSISTANT_ID environment variable is not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unable to authenticate user');
    }

    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('id, content')
      .eq('product_id', productId)
      .eq('user_id', user.id);

    if (promptsError) {
      throw new Error(`Error fetching prompts: ${promptsError.message}`);
    }

    if (!prompts || prompts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No prompts found for this product' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    for (const prompt of prompts) {
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt.content,
            },
          ],
        }),
      });

      if (!threadResponse.ok) {
        const errorText = await threadResponse.text();
        console.error('Thread creation error:', errorText);
        throw new Error(`Failed to create thread: ${errorText}`);
      }

      const thread = await threadResponse.json();
      console.log('Thread created:', thread.id);

      const runResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistantId,
          }),
        }
      );

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        console.error('Run creation error:', errorText);
        throw new Error(`Failed to create run: ${errorText}`);
      }

      const run = await runResponse.json();
      console.log('Run started:', run.id);

      let runStatus = run.status;
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await fetch(
          `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
          {
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
          }
        );

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;

        console.log(`Run status (attempt ${attempts}):`, runStatus);
      }

      if (runStatus === 'failed') {
        console.error('Run failed');
        continue;
      }

      if (runStatus !== 'completed') {
        console.error('Run did not complete in time');
        continue;
      }

      const messagesResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      if (!messagesResponse.ok) {
        console.error('Failed to fetch messages');
        continue;
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find(
        (msg: any) => msg.role === 'assistant'
      );

      if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
        console.error('No assistant message found');
        continue;
      }

      const responseText = assistantMessage.content[0].text.value;
      console.log('AI Response:', responseText);

      const { error: insertError } = await supabase
        .from('prompt_responses')
        .insert({
          prompt_id: prompt.id,
          user_id: user.id,
          response: responseText,
        });

      if (insertError) {
        console.error('Error inserting prompt response:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Buyer-intent outputs generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-buyer-intent-outputs function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
