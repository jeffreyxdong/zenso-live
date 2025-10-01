-- Add sources_final column to prompt_responses table
ALTER TABLE public.prompt_responses 
ADD COLUMN sources_final jsonb;