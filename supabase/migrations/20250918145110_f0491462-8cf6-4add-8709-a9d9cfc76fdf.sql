-- Add store_id columns to prompts and products tables
ALTER TABLE public.prompts 
ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.products 
ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

-- Update RLS policies for prompts to include store ownership check
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can create their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.prompts;

CREATE POLICY "Users can view prompts for their stores" 
ON public.prompts 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create prompts for their stores" 
ON public.prompts 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update prompts for their stores" 
ON public.prompts 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete prompts for their stores" 
ON public.prompts 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

-- Update RLS policies for products to include store ownership check
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;

CREATE POLICY "Users can view products for their stores" 
ON public.products 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create products for their stores" 
ON public.products 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update products for their stores" 
ON public.products 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete products for their stores" 
ON public.products 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
);