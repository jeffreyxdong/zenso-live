-- Create brand_prompts table for brand-level prompts
CREATE TABLE public.brand_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL,
  brand_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  active BOOLEAN NOT NULL DEFAULT true,
  visibility_score INTEGER,
  sentiment_score INTEGER,
  position_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_prompt_responses table for brand prompt responses
CREATE TABLE public.brand_prompt_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_prompt_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  model_name TEXT NOT NULL,
  source TEXT,
  sources JSONB,
  sources_final JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_prompt_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_prompts
CREATE POLICY "Users can view brand prompts for their stores"
  ON public.brand_prompts
  FOR SELECT
  USING (auth.uid() = user_id AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create brand prompts for their stores"
  ON public.brand_prompts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update brand prompts for their stores"
  ON public.brand_prompts
  FOR UPDATE
  USING (auth.uid() = user_id AND store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service can insert brand prompts"
  ON public.brand_prompts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update brand prompts"
  ON public.brand_prompts
  FOR UPDATE
  USING (true);

-- RLS Policies for brand_prompt_responses
CREATE POLICY "Users can view responses for their brand prompts"
  ON public.brand_prompt_responses
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM brand_prompts
    WHERE brand_prompts.id = brand_prompt_responses.brand_prompt_id
    AND brand_prompts.user_id = auth.uid()
  ));

CREATE POLICY "Service can insert brand prompt responses"
  ON public.brand_prompt_responses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update brand prompt responses"
  ON public.brand_prompt_responses
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_brand_prompts_updated_at
  BEFORE UPDATE ON public.brand_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();