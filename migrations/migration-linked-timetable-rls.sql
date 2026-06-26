-- ============================================================================
-- MIGRATION: Allow Linked Teachers/Parents to View Student Timetable Entries
-- ============================================================================

DROP POLICY IF EXISTS "Linked teachers/parents can view student timetable" ON student_timetable_entries;
CREATE POLICY "Linked teachers/parents can view student timetable" ON student_timetable_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_links
      WHERE parent_id = auth.uid() AND student_id = student_timetable_entries.student_id
    )
  );
