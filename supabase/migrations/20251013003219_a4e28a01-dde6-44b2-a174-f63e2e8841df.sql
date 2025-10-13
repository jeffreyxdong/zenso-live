-- Add ai_mentions column to product_scores table
ALTER TABLE public.product_scores 
ADD COLUMN ai_mentions integer DEFAULT 0;