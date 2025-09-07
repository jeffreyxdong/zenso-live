-- Add brand_name to prompts to store the brand associated with a prompt
ALTER TABLE public.prompts ADD COLUMN IF NOT EXISTS brand_name text;

-- Schedule daily run at 07:00 UTC to invoke the edge function
-- Requires pg_cron and pg_net extensions enabled in the project
select
  cron.schedule(
    'run-daily-brand-visibility-7am',
    '0 7 * * *',
    $$
    select
      net.http_post(
          url:='https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/run-daily-prompt-runner',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM"}'::jsonb,
          body:=jsonb_build_object('run', 'daily')
      ) as request_id;
    $$
  );