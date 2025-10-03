-- Create brand_recommendations table
CREATE TABLE IF NOT EXISTS public.brand_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  impact TEXT NOT NULL,
  effort TEXT NOT NULL,
  site_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brand_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_recommendations
CREATE POLICY "Users can view recommendations for their stores"
  ON public.brand_recommendations
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recommendations for their stores"
  ON public.brand_recommendations
  FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert recommendations"
  ON public.brand_recommendations
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_brand_recommendations_store_id 
  ON public.brand_recommendations(store_id);

CREATE INDEX IF NOT EXISTS idx_brand_recommendations_status 
  ON public.brand_recommendations(store_id, status);