-- Update cron job to use score-buyer-intent-outputs instead of generate-daily-product-scores
SELECT cron.unschedule('generate-daily-product-scores');

SELECT cron.schedule(
  'score-buyer-intent-outputs-daily',
  '0 11 * * *', -- 11 AM UTC = 7 AM ET
  $$
  SELECT
    net.http_post(
        url:='https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/score-buyer-intent-outputs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM"}'::jsonb,
        body:='{"time": "daily_batch"}'::jsonb
    ) as request_id;
  $$
);