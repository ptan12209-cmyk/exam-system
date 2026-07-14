-- Feedback + email verification (OTP) + account_source
-- Apply in Supabase SQL editor after deploy.

-- 1) profiles: verification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_source text;

-- Backfill existing accounts as trusted (do not lock current users)
UPDATE public.profiles
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email_verified_at IS NULL;

UPDATE public.profiles
SET account_source = 'self_register'
WHERE account_source IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN account_source SET DEFAULT 'self_register';

ALTER TABLE public.profiles
  ALTER COLUMN account_source SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_source_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_source_check
      CHECK (account_source IN ('self_register', 'teacher', 'google'));
  END IF;
END $$;

-- 2) OTP codes (hashed)
CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_created
  ON public.email_otps(user_id, created_at DESC);

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No direct client access; only service role / server APIs
DROP POLICY IF EXISTS "email_otps_no_client" ON public.email_otps;

-- 3) System feedback
CREATE TABLE IF NOT EXISTS public.system_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'idea', 'praise', 'other')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 5 AND 2000),
  subject_key text NULL,
  lesson_id uuid NULL,
  page_path text NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'seen', 'in_progress', 'done', 'archived')),
  teacher_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_feedback_created
  ON public.system_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_feedback_status
  ON public.system_feedback(status);
CREATE INDEX IF NOT EXISTS idx_system_feedback_user
  ON public.system_feedback(user_id);

ALTER TABLE public.system_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students insert own feedback" ON public.system_feedback;
CREATE POLICY "Students insert own feedback"
  ON public.system_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students select own feedback" ON public.system_feedback;
CREATE POLICY "Students select own feedback"
  ON public.system_feedback FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

DROP POLICY IF EXISTS "Teachers update feedback" ON public.system_feedback;
CREATE POLICY "Teachers update feedback"
  ON public.system_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );
