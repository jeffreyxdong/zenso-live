-- Create a function to process brand analytics for all stores
CREATE OR REPLACE FUNCTION public.process_all_store_brand_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  store_record RECORD;
  response_id bigint;
BEGIN
  -- Loop through all active stores
  FOR store_record IN 
    SELECT id FROM stores WHERE is_active = true
  LOOP
    -- Call the brand-analytics edge function for each store
    SELECT net.http_post(
      url := 'https://pacinrfuczbjletzsdwe.supabase.co/functions/v1/brand-analytics',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2lucmZ1Y3piamxldHpzZHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDEzNjQsImV4cCI6MjA3MjY3NzM2NH0.F7R3EQP_coqMICDJPjU-2CbU7Eqol3yv-JJJHz1B7TM'
      ),
      body := jsonb_build_object('storeId', store_record.id)
    ) INTO response_id;
    
    -- Optional: Log the request
    RAISE NOTICE 'Triggered brand-analytics for store: %', store_record.id;
  END LOOP;
END;
$$;

-- Drop existing cron job if it exists
SELECT cron.unschedule('run-daily-brand-analytics');

-- Schedule the new cron job to run daily at 2 AM UTC
SELECT cron.schedule(
  'process-brand-analytics-daily',
  '0 2 * * *',
  $$
  SELECT public.process_all_store_brand_analytics();
  $$
);