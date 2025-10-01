-- Create product_recommendations table
CREATE TABLE IF NOT EXISTS public.product_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('content', 'schema', 'technical', 'branding')),
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT NOT NULL CHECK (effort IN ('high', 'medium', 'low')),
  pdp_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view recommendations for their products"
ON public.product_recommendations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_recommendations.product_id
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recommendations for their products"
ON public.product_recommendations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_recommendations.product_id
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert recommendations"
ON public.product_recommendations
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_product_recommendations_updated_at
BEFORE UPDATE ON public.product_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();