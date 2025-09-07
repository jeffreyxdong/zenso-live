-- Create table for daily visibility tracking
CREATE TABLE public.prompt_daily_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  visibility_score INTEGER NOT NULL,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing AI responses and sources
CREATE TABLE public.prompt_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL, -- 'openai' or 'gemini'
  response_text TEXT NOT NULL,
  sources JSONB, -- Array of {site_name: string, link: string}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for prompt_daily_scores
CREATE POLICY "Users can view scores for their own prompts" 
ON public.prompt_daily_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.prompts 
  WHERE prompts.id = prompt_daily_scores.prompt_id 
  AND prompts.user_id = auth.uid()
));

CREATE POLICY "Service can insert daily scores" 
ON public.prompt_daily_scores 
FOR INSERT 
WITH CHECK (true);

-- Create policies for prompt_responses  
CREATE POLICY "Users can view responses for their own prompts"
ON public.prompt_responses
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.prompts 
  WHERE prompts.id = prompt_responses.prompt_id 
  AND prompts.user_id = auth.uid()
));

CREATE POLICY "Service can insert prompt responses"
ON public.prompt_responses
FOR INSERT
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_prompt_daily_scores_prompt_id ON public.prompt_daily_scores(prompt_id);
CREATE INDEX idx_prompt_daily_scores_measured_at ON public.prompt_daily_scores(measured_at);
CREATE INDEX idx_prompt_responses_prompt_id ON public.prompt_responses(prompt_id);