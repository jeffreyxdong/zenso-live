-- Schedule daily brand analytics to run at 7 AM ET (11 AM UTC)
-- This runs concurrently with the PDP scoring cron job
SELECT cron.schedule(
  'run-daily-brand-analytics',
  '0 11 * * *', -- 11 AM UTC = 7 AM ET
  $$
  SELECT
    net.http_post(
        url:='https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/run-daily-brand-analytics',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM"}'::jsonb,
        body:='{"time": "daily_batch"}'::jsonb
    ) as request_id;
  $$
);