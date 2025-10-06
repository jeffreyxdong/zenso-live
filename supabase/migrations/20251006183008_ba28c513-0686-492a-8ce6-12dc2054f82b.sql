-- Enable realtime for user_generated_prompt_daily_scores table
ALTER TABLE user_generated_prompt_daily_scores REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_prompt_daily_scores;