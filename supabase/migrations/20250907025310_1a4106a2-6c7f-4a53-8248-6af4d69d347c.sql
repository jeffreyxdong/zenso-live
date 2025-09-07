-- Remove the title column from prompts table since we removed it from the UI
ALTER TABLE public.prompts DROP COLUMN title;