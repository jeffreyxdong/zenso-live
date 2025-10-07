-- Add foreign key constraint from brand_prompt_responses to brand_prompts
ALTER TABLE public.brand_prompt_responses
ADD CONSTRAINT brand_prompt_responses_brand_prompt_id_fkey
FOREIGN KEY (brand_prompt_id)
REFERENCES public.brand_prompts(id)
ON DELETE CASCADE;