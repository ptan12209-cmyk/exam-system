-- ============================================================================
-- MIGRATION: Initialize student_timetable_entries and Setup RLS Policies
-- ============================================================================

-- 1. Create table student_timetable_entries if it doesn't exist
CREATE TABLE IF NOT EXISTS public.student_timetable_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),  -- teacher_id/parent_id
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  subject text NOT NULL,
  class_name text,
  room text,
  note text,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_student_timetable_student ON public.student_timetable_entries(student_id);

-- 3. Enable RLS
ALTER TABLE public.student_timetable_entries ENABLE ROW LEVEL SECURITY;

-- 4. Setup all RLS Policies
DROP POLICY IF EXISTS "Teacher manages student timetable" ON public.student_timetable_entries;
CREATE POLICY "Teacher manages student timetable" ON public.student_timetable_entries
  FOR ALL USING (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Student reads own timetable" ON public.student_timetable_entries;
CREATE POLICY "Student reads own timetable" ON public.student_timetable_entries
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Linked teachers/parents can view student timetable" ON public.student_timetable_entries;
CREATE POLICY "Linked teachers/parents can view student timetable" ON public.student_timetable_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = public.student_timetable_entries.student_id
    )
  );

