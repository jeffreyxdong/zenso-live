-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Create unique index on username (allowing null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles(username) WHERE username IS NOT NULL;