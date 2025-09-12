-- Create shops table to store Shopify store credentials
CREATE TABLE public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_domain)
);

-- Enable Row Level Security
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own shops" 
ON public.shops 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shops" 
ON public.shops 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shops" 
ON public.shops 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shops" 
ON public.shops 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();