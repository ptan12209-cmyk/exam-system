-- Single active device per student account
-- Run in Supabase SQL Editor (or CLI) before relying on bind/verify APIs.

CREATE TABLE IF NOT EXISTS public.user_device_bindings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_label text,
  user_agent text,
  bound_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_device_bindings_device_id_len
    CHECK (char_length(device_id) >= 16 AND char_length(device_id) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_user_device_bindings_device_id
  ON public.user_device_bindings (device_id);

COMMENT ON TABLE public.user_device_bindings IS
  'One active browser/device fingerprint per user. Login rebinds; other devices fail verify.';

ALTER TABLE public.user_device_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own device binding" ON public.user_device_bindings;
CREATE POLICY "Users read own device binding"
  ON public.user_device_bindings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Writes only via service role (API routes). No INSERT/UPDATE/DELETE for authenticated.
