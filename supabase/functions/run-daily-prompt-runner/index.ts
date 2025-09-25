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
          let totalVisibilityScore = 0;
          let totalSentimentScore = 0;
          let validScores = 0;

          // Combine all responses into one for comprehensive scoring
          const combinedContent = responses.map(r => `${r.model.toUpperCase()} Response: ${r.text}`).join('\n\n');
          console.log(`Scoring combined content with brand "${prompt.brand_name}"`);
          console.log(`Combined content preview: ${combinedContent.substring(0, 200)}...`);

          try {
            // Score brand visibility and sentiment using edge functions
            const [visibilityResult, sentimentResult] = await Promise.allSettled([
              fetch(`${supabaseUrl}/functions/v1/score-brand-visibility`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: combinedContent,
                  brandName: prompt.brand_name
                }),
              }).then(res => res.json()),
              
              fetch(`${supabaseUrl}/functions/v1/score-brand-sentiment`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  content: combinedContent,
                  brandName: prompt.brand_name
                }),
              }).then(res => res.json())
            ]);

            console.log('Visibility result:', visibilityResult);
            console.log('Sentiment result:', sentimentResult);

            const visibilityScore = visibilityResult.status === 'fulfilled' ? visibilityResult.value?.score || 0 : 0;
            const sentimentScore = sentimentResult.status === 'fulfilled' ? sentimentResult.value?.score || 0 : 0;

            console.log(`Final scores - Visibility: ${visibilityScore}, Sentiment: ${sentimentScore}`);

            // Save responses
            for (const response of responses) {
              await supabase
                .from('prompt_responses')
                .insert({
                  prompt_id: prompt.id,
                  model_name: response.model,
                  response_text: response.text,
                  sources: response.sources
                });
            }

            // Update prompt with scores
            await supabase
              .from('prompts')
              .update({
                visibility_score: visibilityScore,
                sentiment_score: sentimentScore
              })
              .eq('id', prompt.id);

            // Save daily score entry
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Check if we already have a score for today
            const { data: existingScore } = await supabase
              .from('prompt_daily_scores')
              .select('id')
              .eq('prompt_id', prompt.id)
              .eq('date', today)
              .single();

            if (!existingScore) {
              await supabase
                .from('prompt_daily_scores')
                .insert({
                  prompt_id: prompt.id,
                  date: today,
                  visibility_score: visibilityScore,
                  sentiment_score: sentimentScore
                });

              console.log(`Saved daily scores for prompt ${prompt.id} - Visibility: ${visibilityScore}, Sentiment: ${sentimentScore}`);
            } else {
              console.log(`Daily score already exists for prompt ${prompt.id} on ${today}`);
            }

          } catch (error) {
            console.error('Error scoring responses:', error);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
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