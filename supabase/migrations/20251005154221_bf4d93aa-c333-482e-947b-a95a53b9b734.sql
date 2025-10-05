-- Create user_generated_prompts table
CREATE TABLE public.user_generated_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID,
  content TEXT NOT NULL,
  brand_name TEXT,
  visibility_score INTEGER,
  sentiment_score INTEGER,
  position_score INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'suggested'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_generated_prompt_responses table
CREATE TABLE public.user_generated_prompt_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  response_text TEXT NOT NULL,
  source TEXT,
  sources JSONB,
  sources_final JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.user_generated_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_generated_prompt_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_generated_prompts
CREATE POLICY "Users can view prompts for their stores"
ON public.user_generated_prompts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create prompts for their stores"
ON public.user_generated_prompts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update prompts for their stores"
ON public.user_generated_prompts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete prompts for their stores"
ON public.user_generated_prompts
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert user-generated prompts"
ON public.user_generated_prompts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update user-generated prompts"
ON public.user_generated_prompts
FOR UPDATE
USING (true);

-- RLS policies for user_generated_prompt_responses
CREATE POLICY "Users can view responses for their prompts"
ON public.user_generated_prompt_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_generated_prompts
    WHERE user_generated_prompts.id = user_generated_prompt_responses.prompt_id
    AND user_generated_prompts.user_id = auth.uid()
  )
);

CREATE POLICY "Service can insert user-generated responses"
ON public.user_generated_prompt_responses
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update user-generated responses"
ON public.user_generated_prompt_responses
FOR UPDATE
USING (true);

-- Add updated_at trigger for user_generated_prompts
CREATE TRIGGER update_user_generated_prompts_updated_at
BEFORE UPDATE ON public.user_generated_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_generated_prompts_user_id ON public.user_generated_prompts(user_id);
CREATE INDEX idx_user_generated_prompts_store_id ON public.user_generated_prompts(store_id);
CREATE INDEX idx_user_generated_prompt_responses_prompt_id ON public.user_generated_prompt_responses(prompt_id);