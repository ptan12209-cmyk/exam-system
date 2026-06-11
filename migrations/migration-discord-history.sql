-- ============================================================================
-- MIGRATION: Discord Attendance Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS discord_attendance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  discord_id text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  joined_at timestamptz NOT NULL,
  left_at timestamptz,
  total_active_seconds integer DEFAULT 0,
  total_afk_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discord_logs_student ON discord_attendance_logs(student_id, session_date);

-- Enable RLS
ALTER TABLE discord_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Teachers can view linked students' logs
CREATE POLICY "Teachers can view linked student discord logs" ON discord_attendance_logs
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM parent_student_links 
      WHERE parent_id = auth.uid()
    )
  );

-- Policy: Students can view their own logs
CREATE POLICY "Students can view own discord logs" ON discord_attendance_logs
  FOR SELECT USING (
    student_id = auth.uid()
  );
