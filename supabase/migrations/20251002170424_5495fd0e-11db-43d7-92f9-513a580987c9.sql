-- Create a view that joins brand_prompt_responses with brand_prompts
CREATE OR REPLACE VIEW public.brand_prompt_responses_with_prompts AS
SELECT 
  bpr.id as response_id,
  bpr.source,
  bpr.model_name,
  bpr.response_text,
  bpr.sources,
  bpr.sources_final,
  bpr.created_at as response_created_at,
  bp.id as prompt_id,
  bp.brand_name,
  bp.content as prompt_content,
  bp.position_score,
  bp.sentiment_score,
  bp.visibility_score,
  bp.active as prompt_active,
  bp.status as prompt_status,
  bp.store_id,
  bp.user_id,
  bp.created_at as prompt_created_at,
  bp.updated_at as prompt_updated_at
FROM 
  public.brand_prompt_responses bpr
  JOIN public.brand_prompts bp ON bpr.brand_prompt_id = bp.id;