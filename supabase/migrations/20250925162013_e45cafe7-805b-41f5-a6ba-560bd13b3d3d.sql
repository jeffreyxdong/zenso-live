-- Create a view that joins product_scores with products to show product titles
CREATE VIEW public.product_scores_with_titles AS
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

-- Create RLS policy for the view
ALTER VIEW public.product_scores_with_titles SET (security_barrier = true);

-- Add a comment explaining the view
COMMENT ON VIEW public.product_scores_with_titles IS 'View that shows product scores joined with product information for easier identification';