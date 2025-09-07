-- Add missing brand_name column to prompts table
ALTER TABLE public.prompts
ADD COLUMN IF NOT EXISTS brand_name TEXT;