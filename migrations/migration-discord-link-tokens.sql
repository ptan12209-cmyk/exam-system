-- ============================================================================
-- MIGRATION: DISCORD ACCOUNT LINKING TOKENS
-- Run this script in your Supabase SQL Editor to set up account linking
-- ============================================================================

-- 1. Create discord_link_tokens table
CREATE TABLE IF NOT EXISTS public.discord_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(8) UNIQUE NOT NULL,
  discord_id VARCHAR(20) NOT NULL,
  discord_username VARCHAR(100),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_discord_link_tokens_token 
  ON public.discord_link_tokens(token) 
  WHERE used = FALSE AND expires_at > NOW();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.discord_link_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Policies (restrictive by default, only backend/service role uses it)
DROP POLICY IF EXISTS "Service role access only" ON public.discord_link_tokens;
-- We do not need explicit select policies for service_role as it bypasses RLS automatically.
-- However, we can add a basic read policy for debugging if needed, but keeping it empty is safest.

-- 5. Helper function to clean up expired and used tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.discord_link_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
