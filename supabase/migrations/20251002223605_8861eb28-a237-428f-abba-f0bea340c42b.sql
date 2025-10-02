-- Enable realtime for brand_scores table
ALTER TABLE public.brand_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_scores;