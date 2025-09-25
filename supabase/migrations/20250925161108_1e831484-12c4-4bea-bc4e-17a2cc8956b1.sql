-- Add foreign key constraint to link product_scores to products
ALTER TABLE public.product_scores 
ADD CONSTRAINT fk_product_scores_product_id 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;