-- Create table for competitor visibility scores
CREATE TABLE IF NOT EXISTS public.competitor_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES public.competitor_analytics(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  visibility_score INTEGER,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competitor_id, date)
);

-- Enable RLS
ALTER TABLE public.competitor_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_scores
CREATE POLICY "Users can view competitor scores for their stores"
  ON public.competitor_scores
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert competitor scores"
  ON public.competitor_scores
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update competitor scores"
  ON public.competitor_scores
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_competitor_scores_updated_at
  BEFORE UPDATE ON public.competitor_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_competitor_scores_competitor_date ON public.competitor_scores(competitor_id, date DESC);
CREATE INDEX idx_competitor_scores_store_date ON public.competitor_scores(store_id, date DESC);