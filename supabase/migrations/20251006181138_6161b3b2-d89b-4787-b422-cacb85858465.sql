-- First, clean up orphaned records that reference non-existent stores
DELETE FROM brand_scores WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM brand_prompts WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM brand_recommendations WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM competitor_analytics WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM products WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM prompts WHERE store_id NOT IN (SELECT id FROM stores);
DELETE FROM user_generated_prompts WHERE store_id NOT IN (SELECT id FROM stores);

-- Now add CASCADE delete to all tables that reference stores
ALTER TABLE brand_scores DROP CONSTRAINT IF EXISTS brand_scores_store_id_fkey;
ALTER TABLE brand_scores ADD CONSTRAINT brand_scores_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE brand_prompts DROP CONSTRAINT IF EXISTS brand_prompts_store_id_fkey;
ALTER TABLE brand_prompts ADD CONSTRAINT brand_prompts_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE brand_recommendations DROP CONSTRAINT IF EXISTS brand_recommendations_store_id_fkey;
ALTER TABLE brand_recommendations ADD CONSTRAINT brand_recommendations_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE competitor_analytics DROP CONSTRAINT IF EXISTS competitor_analytics_store_id_fkey;
ALTER TABLE competitor_analytics ADD CONSTRAINT competitor_analytics_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_store_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_store_id_fkey;
ALTER TABLE prompts ADD CONSTRAINT prompts_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE user_generated_prompts DROP CONSTRAINT IF EXISTS user_generated_prompts_store_id_fkey;
ALTER TABLE user_generated_prompts ADD CONSTRAINT user_generated_prompts_store_id_fkey 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;