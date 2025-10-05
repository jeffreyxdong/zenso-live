-- Enable real-time updates for products table
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- Enable real-time updates for user_generated_prompts table
ALTER TABLE user_generated_prompts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_prompts;