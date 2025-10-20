-- Schedule daily user-generated prompt runner to run at 11 AM UTC (7 AM ET) every day
SELECT cron.schedule(
  'run-daily-user-prompt-runner',
  '0 11 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/run-daily-user-prompt-runner',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);