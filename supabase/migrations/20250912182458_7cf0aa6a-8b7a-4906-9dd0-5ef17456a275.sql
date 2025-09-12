-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.ensure_single_active_store()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- If setting a store as active, deactivate all other stores for this user
  IF NEW.is_active = true THEN
    UPDATE public.stores 
    SET is_active = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;