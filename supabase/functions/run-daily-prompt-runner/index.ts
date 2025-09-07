import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily prompt runner...');

    // Get all active prompts that have brand names
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('id, content, brand_name, user_id')
      .eq('status', 'active')
      .not('brand_name', 'is', null);

    if (promptsError) {
      console.error('Error fetching prompts:', promptsError);
      throw promptsError;
    }

    console.log(`Found ${prompts?.length || 0} active prompts to process`);

    for (const prompt of prompts || []) {
      try {
        console.log(`Processing prompt ${prompt.id} for brand: ${prompt.brand_name}`);

        // Run prompt through both AI models
        const responses = [];
        
        // OpenAI
        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a helpful assistant that provides informative responses.' },
                { role: 'user', content: prompt.content }
              ],
              max_tokens: 1000
            }),
          });

          if (openaiResponse.ok) {
            const data = await openaiResponse.json();
            const responseText = data.choices[0].message.content;
            responses.push({
              model: 'openai',
              text: responseText,
              sources: extractSources(responseText)
            });
            console.log('OpenAI response generated successfully');
          }
        } catch (error) {
          console.error('OpenAI API error:', error);
        }

        // Gemini
        try {
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt.content
                }]
              }]
            }),
          });

          if (geminiResponse.ok) {
            const data = await geminiResponse.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            responses.push({
              model: 'gemini',
              text: responseText,
              sources: extractSources(responseText)
            });
            console.log('Gemini response generated successfully');
          }
        } catch (error) {
          console.error('Gemini API error:', error);
        }

        // Score responses and save
        if (responses.length > 0) {
          let totalScore = 0;
          let validScores = 0;

          for (const response of responses) {
            try {
              // Score brand visibility
              const scoreResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openAIApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'system',
                      content: `You are tasked with scoring the visibility of a specific brand in the given text. Rate the brand visibility from 0-100 based on how prominently the brand "${prompt.brand_name}" is mentioned, discussed, or featured in the content. Consider frequency, context, and prominence of mentions. Respond only with a number between 0 and 100.`
                    },
                    {
                      role: 'user',
                      content: response.text
                    }
                  ],
                  max_tokens: 10
                }),
              });

              if (scoreResponse.ok) {
                const scoreData = await scoreResponse.json();
                const scoreText = scoreData.choices[0].message.content.trim();
                const score = parseInt(scoreText);
                if (!isNaN(score) && score >= 0 && score <= 100) {
                  totalScore += score;
                  validScores++;
                }
              }

              // Save response
              await supabase
                .from('prompt_responses')
                .insert({
                  prompt_id: prompt.id,
                  model_name: response.model,
                  response_text: response.text,
                  sources: response.sources
                });

            } catch (error) {
              console.error('Error processing response:', error);
            }
          }

          // Save daily score
          if (validScores > 0) {
            const averageScore = Math.round(totalScore / validScores);
            await supabase
              .from('prompt_daily_scores')
              .insert({
                prompt_id: prompt.id,
                visibility_score: averageScore,
                measured_at: new Date().toISOString()
              });

            console.log(`Saved daily score ${averageScore} for prompt ${prompt.id}`);
          }
        }

      } catch (error) {
        console.error(`Error processing prompt ${prompt.id}:`, error);
      }
    }

    console.log('Daily prompt runner completed successfully');

    return new Response(
      JSON.stringify({ success: true, processed: prompts?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily prompt runner:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function extractSources(text: string): Array<{ site_name: string; link: string }> {
  const sources: Array<{ site_name: string; link: string }> = [];
  
  // Look for common patterns that might indicate sources
  const urlPattern = /https?:\/\/(www\.)?([a-zA-Z0-9-]+)\.[a-zA-Z]{2,}/g;
  const matches = text.match(urlPattern);
  
  if (matches) {
    matches.forEach(url => {
      try {
        const urlObj = new URL(url);
        const siteName = urlObj.hostname.replace('www.', '');
        sources.push({
          site_name: siteName,
          link: url
        });
      } catch (e) {
        // Invalid URL, skip
      }
    });
  }

  // Also look for mentioned site names without full URLs
  const sitePatterns = [
    /mentioned on ([a-zA-Z0-9-]+\.com)/gi,
    /according to ([a-zA-Z0-9-]+\.com)/gi,
    /from ([a-zA-Z0-9-]+\.com)/gi,
    /via ([a-zA-Z0-9-]+\.com)/gi
  ];

  sitePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const siteName = match.split(' ').pop()?.replace('.com', '') || '';
        if (siteName && !sources.find(s => s.site_name.includes(siteName))) {
          sources.push({
            site_name: siteName + '.com',
            link: `https://${siteName}.com`
          });
        }
      });
    }
  });

  return sources.slice(0, 10); // Limit to 10 sources
}