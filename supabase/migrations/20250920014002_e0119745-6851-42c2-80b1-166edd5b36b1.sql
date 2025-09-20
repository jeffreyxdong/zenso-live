-- Create table for prompt daily scores time series data
CREATE TABLE public.prompt_daily_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL,
  date DATE NOT NULL,
  visibility_score INTEGER,
  sentiment_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prompt_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.prompt_daily_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view scores for their own prompts" 
ON public.prompt_daily_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM prompts 
  WHERE prompts.id = prompt_daily_scores.prompt_id 
  AND prompts.user_id = auth.uid()
));

CREATE POLICY "Service can insert prompt daily scores" 
ON public.prompt_daily_scores 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service can update prompt daily scores" 
ON public.prompt_daily_scores 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompt_daily_scores_updated_at
BEFORE UPDATE ON public.prompt_daily_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();