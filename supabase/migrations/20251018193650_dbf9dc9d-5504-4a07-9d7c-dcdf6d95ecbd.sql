-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to run daily product scoring at 7 AM ET (11 AM UTC)
SELECT cron.schedule(
  'generate-daily-product-scores',
  '0 11 * * *', -- 11 AM UTC = 7 AM ET (accounting for EST, adjust for EDT if needed)
  $$
  SELECT
    net.http_post(
        url:='https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/generate-daily-product-scores',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);