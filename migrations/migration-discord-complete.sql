-- ============================================================================
-- MIGRATION: COMPLETE DISCORD VOICE INTEGRATION & TRACKING
-- Run this script in your Supabase SQL Editor to set up everything
-- ============================================================================

-- 1. Add Discord fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_discord_study_date DATE;

-- 2. Drop the existing status constraint on study_sessions and recreate it
ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_status_check;
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_status_check 
    CHECK (status IN ('focusing', 'resting', 'offline', 'discord_class', 'discord_afk'));

-- 3. Add Discord fields to study_sessions table
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_duration INTEGER DEFAULT 0; -- total discord call seconds today
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_deafened BOOLEAN DEFAULT false; -- true if student deafened (AFK)
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 4. Create discord_attendance_logs table
CREATE TABLE IF NOT EXISTS public.discord_attendance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  discord_id text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  joined_at timestamptz NOT NULL,
  left_at timestamptz,
  total_active_seconds integer DEFAULT 0,
  total_afk_seconds integer DEFAULT 0,
  total_muted_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. Create index for logs if not exists
CREATE INDEX IF NOT EXISTS idx_discord_logs_student ON public.discord_attendance_logs(student_id, session_date);

-- 6. Enable Row Level Security (RLS) on discord_attendance_logs
ALTER TABLE public.discord_attendance_logs ENABLE ROW LEVEL SECURITY;

-- 7. Define RLS Policies
DROP POLICY IF EXISTS "Teachers can view linked student discord logs" ON public.discord_attendance_logs;
CREATE POLICY "Teachers can view linked student discord logs" ON public.discord_attendance_logs
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM public.parent_student_links 
      WHERE parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view own discord logs" ON public.discord_attendance_logs;
CREATE POLICY "Students can view own discord logs" ON public.discord_attendance_logs
  FOR SELECT USING (
    student_id = auth.uid()
  );
