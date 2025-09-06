-- Add new columns to prompts table for the enhanced UI
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS visibility_score INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'suggested' CHECK (status IN ('active', 'suggested', 'inactive'));