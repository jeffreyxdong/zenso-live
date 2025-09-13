-- Add scoring columns to products table
ALTER TABLE public.products 
ADD COLUMN visibility_score integer,
ADD COLUMN position_score integer,
ADD COLUMN sentiment_score integer;

-- Remove scoring columns from prompts table
ALTER TABLE public.prompts 
DROP COLUMN IF EXISTS visibility_score,
DROP COLUMN IF EXISTS position_score,
DROP COLUMN IF EXISTS sentiment_score;