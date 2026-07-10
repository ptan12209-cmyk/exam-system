-- ============================================================================
-- Content access audit log (play / open document)
-- Run in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_access_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    lesson_id uuid REFERENCES public.online_lessons(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'playback' | 'document' | 'list'
    ip text,
    user_agent text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_access_logs_user
  ON public.content_access_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_access_logs_lesson
  ON public.content_access_logs(lesson_id, created_at DESC);

ALTER TABLE public.content_access_logs ENABLE ROW LEVEL SECURITY;

-- Students cannot read logs; teachers/admins can (optional)
DROP POLICY IF EXISTS "teachers_read_access_logs" ON public.content_access_logs;
CREATE POLICY "teachers_read_access_logs"
ON public.content_access_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

-- Inserts only via service role from API (no client insert policy)
