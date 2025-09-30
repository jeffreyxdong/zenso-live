-- Drop the view first
DROP VIEW IF EXISTS public.prompt_responses_with_prompts;

-- Change sources column back to jsonb
ALTER TABLE public.prompt_responses 
ALTER COLUMN sources TYPE jsonb USING sources::jsonb;

-- Recreate the view
CREATE OR REPLACE VIEW public.prompt_responses_with_prompts AS
SELECT 
  pr.id as response_id,
  pr.prompt_id,
  pr.model_name,
  pr.response_text,
  pr.source,
  pr.sources,
  pr.created_at as response_created_at,
  p.content as prompt_content,
  p.user_id,
  p.product_id,
  p.store_id,
  p.brand_name,
  p.active as prompt_active,
  p.status as prompt_status,
  p.created_at as prompt_created_at,
  p.updated_at as prompt_updated_at,
  p.visibility_score,
  p.sentiment_score,
  p.position_score,
  prod.title as product_title,
  prod.handle as product_handle
FROM public.prompt_responses pr
JOIN public.prompts p ON pr.prompt_id = p.id
LEFT JOIN public.products prod ON p.product_id = prod.id;