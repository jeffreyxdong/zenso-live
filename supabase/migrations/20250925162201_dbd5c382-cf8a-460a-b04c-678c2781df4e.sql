-- Fix the security definer view issue by recreating it with SECURITY INVOKER
DROP VIEW IF EXISTS public.product_scores_with_titles CASCADE;

-- Create the view with explicit SECURITY INVOKER to use the querying user's permissions
CREATE VIEW public.product_scores_with_titles 
WITH (security_invoker=true) AS
SELECT 
    ps.id,
    ps.product_id,
    p.title AS product_title,
    p.handle AS product_handle,
    ps.visibility_score,
    ps.sentiment_score,
    ps.position_score,
    ps.created_at,
    ps.updated_at
FROM public.product_scores ps
JOIN public.products p ON ps.product_id = p.id
ORDER BY ps.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.product_scores_with_titles TO authenticated;

-- Add a comment explaining the view
COMMENT ON VIEW public.product_scores_with_titles IS 'View that shows product scores with product titles - uses security invoker for proper RLS';