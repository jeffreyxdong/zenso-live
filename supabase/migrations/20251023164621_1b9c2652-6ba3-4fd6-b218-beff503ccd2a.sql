-- Create a function to delete user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_store_ids uuid[];
  v_product_ids uuid[];
  v_prompt_ids uuid[];
  v_brand_prompt_ids uuid[];
  v_user_prompt_ids uuid[];
  v_competitor_ids uuid[];
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get all store IDs for this user
  SELECT array_agg(id) INTO v_store_ids
  FROM stores
  WHERE user_id = v_user_id;

  -- Get all product IDs for this user
  SELECT array_agg(id) INTO v_product_ids
  FROM products
  WHERE user_id = v_user_id;

  -- Get all prompt IDs for this user
  SELECT array_agg(id) INTO v_prompt_ids
  FROM prompts
  WHERE user_id = v_user_id;

  -- Get all brand prompt IDs for this user
  SELECT array_agg(id) INTO v_brand_prompt_ids
  FROM brand_prompts
  WHERE user_id = v_user_id;

  -- Get all user generated prompt IDs for this user
  SELECT array_agg(id) INTO v_user_prompt_ids
  FROM user_generated_prompts
  WHERE user_id = v_user_id;

  -- Get all competitor IDs for user's stores
  SELECT array_agg(id) INTO v_competitor_ids
  FROM competitor_analytics
  WHERE store_id = ANY(v_store_ids);

  -- Delete in order to avoid foreign key violations
  
  -- Delete user generated prompt daily scores
  DELETE FROM user_generated_prompt_daily_scores
  WHERE prompt_id = ANY(v_user_prompt_ids);

  -- Delete user generated prompt responses
  DELETE FROM user_generated_prompt_responses
  WHERE prompt_id = ANY(v_user_prompt_ids);

  -- Delete user generated prompts
  DELETE FROM user_generated_prompts
  WHERE user_id = v_user_id;

  -- Delete brand prompt responses
  DELETE FROM brand_prompt_responses
  WHERE brand_prompt_id = ANY(v_brand_prompt_ids);

  -- Delete brand prompts
  DELETE FROM brand_prompts
  WHERE user_id = v_user_id;

  -- Delete prompt responses
  DELETE FROM prompt_responses
  WHERE prompt_id = ANY(v_prompt_ids);

  -- Delete prompts
  DELETE FROM prompts
  WHERE user_id = v_user_id;

  -- Delete product scores
  DELETE FROM product_scores
  WHERE product_id = ANY(v_product_ids);

  -- Delete product recommendations
  DELETE FROM product_recommendations
  WHERE product_id = ANY(v_product_ids);

  -- Delete product variants
  DELETE FROM product_variants
  WHERE product_id = ANY(v_product_ids);

  -- Delete products
  DELETE FROM products
  WHERE user_id = v_user_id;

  -- Delete competitor scores
  DELETE FROM competitor_scores
  WHERE competitor_id = ANY(v_competitor_ids);

  -- Delete competitor analytics
  DELETE FROM competitor_analytics
  WHERE store_id = ANY(v_store_ids);

  -- Delete brand scores
  DELETE FROM brand_scores
  WHERE store_id = ANY(v_store_ids);

  -- Delete brand recommendations
  DELETE FROM brand_recommendations
  WHERE store_id = ANY(v_store_ids);

  -- Delete shops
  DELETE FROM shops
  WHERE user_id = v_user_id;

  -- Delete stores
  DELETE FROM stores
  WHERE user_id = v_user_id;

  -- Delete profile
  DELETE FROM profiles
  WHERE user_id = v_user_id;

  -- Finally, delete the auth user (this is the critical step)
  DELETE FROM auth.users
  WHERE id = v_user_id;
END;
$$;