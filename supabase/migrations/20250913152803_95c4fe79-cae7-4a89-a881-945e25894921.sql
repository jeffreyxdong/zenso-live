-- Add product_id column to prompts table to link prompts to products
ALTER TABLE public.prompts ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Add active column to prompts table (boolean, defaulting to true)
ALTER TABLE public.prompts ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX idx_prompts_product_id ON public.prompts(product_id);
CREATE INDEX idx_prompts_active ON public.prompts(active);