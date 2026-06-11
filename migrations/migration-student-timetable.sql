-- ============================================================================
-- MIGRATION: Student Timetable Entries
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_timetable_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),  -- teacher_id/parent_id
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

-- Indexing for quick retrieval
CREATE INDEX IF NOT EXISTS idx_student_timetable_student ON student_timetable_entries(student_id);

-- Enable RLS
ALTER TABLE student_timetable_entries ENABLE ROW LEVEL SECURITY;

-- Policies: Teachers/parents who assigned the slot or are linked can manage
CREATE POLICY "Teacher manages student timetable" ON student_timetable_entries
  FOR ALL USING (assigned_by = auth.uid());

CREATE POLICY "Student reads own timetable" ON student_timetable_entries
  FOR SELECT USING (student_id = auth.uid());
