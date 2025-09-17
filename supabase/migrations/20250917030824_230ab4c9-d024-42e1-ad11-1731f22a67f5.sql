-- Add scoring columns to prompts table
ALTER TABLE public.prompts 
ADD COLUMN visibility_score integer,
ADD COLUMN sentiment_score integer,
ADD COLUMN position_score integer;