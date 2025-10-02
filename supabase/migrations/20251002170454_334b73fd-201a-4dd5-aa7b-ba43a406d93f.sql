-- Fix security definer issue by enabling security_invoker on the view
ALTER VIEW public.brand_prompt_responses_with_prompts SET (security_invoker = on);