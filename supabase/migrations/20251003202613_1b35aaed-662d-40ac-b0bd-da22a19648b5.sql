-- Create competitor_analytics table to store competitor data
CREATE TABLE IF NOT EXISTS public.competitor_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL,
  name text NOT NULL,
  website text,
  description text NOT NULL,
  market_position text NOT NULL,
  key_differentiator text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view competitors for their own stores
CREATE POLICY "Users can view competitors for their stores"
  ON public.competitor_analytics
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- Service role can insert competitors
CREATE POLICY "Service can insert competitors"
  ON public.competitor_analytics
  FOR INSERT
  WITH CHECK (true);

-- Service role can update competitors
CREATE POLICY "Service can update competitors"
  ON public.competitor_analytics
  FOR UPDATE
  USING (true);

-- Users can delete competitors for their own stores
CREATE POLICY "Users can delete competitors for their stores"
  ON public.competitor_analytics
  FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM public.stores WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_competitor_analytics_updated_at
  BEFORE UPDATE ON public.competitor_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_competitor_analytics_store_id ON public.competitor_analytics(store_id);
