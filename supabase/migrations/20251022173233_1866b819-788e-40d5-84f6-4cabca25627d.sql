-- Update the brand analytics cron job to run at 11 AM UTC (7 AM ET) to match other cron jobs
SELECT cron.unschedule('process-brand-analytics-daily');

SELECT cron.schedule(
  'process-brand-analytics-daily',
  '0 11 * * *', -- 11 AM UTC = 7 AM ET, consistent with other cron jobs
  $$
  SELECT public.process_all_store_brand_analytics();
  $$
);