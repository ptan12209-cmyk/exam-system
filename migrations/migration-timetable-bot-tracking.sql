-- ============================================================================
-- MIGRATION: Timetable Bot Tracking and Student Self-Management RLS
-- Run this script in your Supabase SQL Editor to set up everything
-- ============================================================================

-- 1. Create table public.timetable_study_logs if it doesn't exist
CREATE TABLE IF NOT EXISTS public.timetable_study_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id text NOT NULL,                          -- Slot ID (UUID or code like mon-sang)
  subject text NOT NULL,                          -- Subject title
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer DEFAULT 0,             -- Accumulated study seconds
  is_completed boolean DEFAULT false,             -- True if student completed enough time
  start_time time NOT NULL,                       -- Scheduled start time
  end_time time NOT NULL,                         -- Scheduled end time
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, slot_id, session_date)
);

-- 2. Enable RLS on timetable_study_logs
ALTER TABLE public.timetable_study_logs ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies for timetable_study_logs
DROP POLICY IF EXISTS "Anyone authenticated can view logs" ON public.timetable_study_logs;
CREATE POLICY "Anyone authenticated can view logs" ON public.timetable_study_logs 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Students can manage own logs" ON public.timetable_study_logs;
CREATE POLICY "Students can manage own logs" ON public.timetable_study_logs 
  FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 4. Enable students to manage their own custom student_timetable_entries (needed for Student X self-customization syncing)
DROP POLICY IF EXISTS "Student manages own timetable" ON public.student_timetable_entries;
CREATE POLICY "Student manages own timetable" ON public.student_timetable_entries 
  FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 5. Enable teachers/admins to manage all student timetable entries (needed for the teacher monitoring dashboard)
DROP POLICY IF EXISTS "Teacher manages student timetable" ON public.student_timetable_entries;
CREATE POLICY "Teacher manages student timetable" ON public.student_timetable_entries
  FOR ALL TO authenticated USING (
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  ) WITH CHECK (
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );
