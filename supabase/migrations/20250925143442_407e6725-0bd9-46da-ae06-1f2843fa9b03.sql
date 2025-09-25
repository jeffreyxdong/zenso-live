-- Create product_scores table for tracking daily scores
CREATE TABLE public.product_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  visibility_score INTEGER,
  sentiment_score INTEGER,
  position_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for user access to their product scores
CREATE POLICY "Users can view scores for their own products" 
ON public.product_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_scores.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can create scores for their own products" 
ON public.product_scores 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_scores.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Users can update scores for their own products" 
ON public.product_scores 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_scores.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Service can insert product scores" 
ON public.product_scores 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_product_scores_updated_at
BEFORE UPDATE ON public.product_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on product_id queries
CREATE INDEX idx_product_scores_product_id ON public.product_scores(product_id);
CREATE INDEX idx_product_scores_created_at ON public.product_scores(created_at);