-- Add store_name column to brand_scores table
ALTER TABLE public.brand_scores
ADD COLUMN store_name TEXT;

-- Backfill existing records with store names
UPDATE public.brand_scores bs
SET store_name = s.name
FROM public.stores s
WHERE bs.store_id = s.id;

-- Make store_name not nullable going forward (after backfill)
ALTER TABLE public.brand_scores
ALTER COLUMN store_name SET NOT NULL;