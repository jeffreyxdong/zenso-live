-- Add RLS policy to allow service to update prompt_responses
CREATE POLICY "Service can update prompt responses"
ON public.prompt_responses
FOR UPDATE
USING (true);