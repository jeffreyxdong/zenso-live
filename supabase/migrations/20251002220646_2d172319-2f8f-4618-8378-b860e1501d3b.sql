-- Create brand_scores table to track daily brand visibility scores
CREATE TABLE public.brand_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  date DATE NOT NULL,
  visibility_score INTEGER,
  sentiment_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.brand_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view scores for their own stores"
  ON public.brand_scores
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert brand scores"
  ON public.brand_scores
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update brand scores"
  ON public.brand_scores
  FOR UPDATE
  USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_brand_scores_updated_at
  BEFORE UPDATE ON public.brand_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_brand_scores_store_date ON public.brand_scores(store_id, date DESC);