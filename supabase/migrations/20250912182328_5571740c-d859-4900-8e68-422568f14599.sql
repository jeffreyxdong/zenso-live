-- Create stores table for multi-store management
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own stores" 
ON public.stores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stores" 
ON public.stores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores" 
ON public.stores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores" 
ON public.stores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to ensure only one active store per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_store()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a store as active, deactivate all other stores for this user
  IF NEW.is_active = true THEN
    UPDATE public.stores 
    SET is_active = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one active store per user
CREATE TRIGGER ensure_single_active_store_trigger
BEFORE INSERT OR UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_store();