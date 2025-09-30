-- Drop the view that depends on the sources column
DROP VIEW IF EXISTS public.prompt_responses_with_prompts;

-- Change sources column type from jsonb to text in prompt_responses table
ALTER TABLE public.prompt_responses 
ALTER COLUMN sources TYPE text;

-- Recreate the view with the updated column type
CREATE OR REPLACE VIEW public.prompt_responses_with_prompts AS
SELECT 
  pr.id as response_id,
  pr.prompt_id,
  pr.response_text,
  pr.model_name,
  pr.sources,
  pr.created_at as response_created_at,
  p.content as prompt_content,
  p.user_id,
  p.product_id,
  p.store_id,
  p.brand_name,
  p.status as prompt_status,
  p.active as prompt_active,
  p.visibility_score,
  p.sentiment_score,
  p.position_score,
  p.created_at as prompt_created_at,
  p.updated_at as prompt_updated_at,
  prod.title as product_title,
  prod.handle as product_handle
FROM public.prompt_responses pr
JOIN public.prompts p ON pr.prompt_id = p.id
LEFT JOIN public.products prod ON p.product_id = prod.id;