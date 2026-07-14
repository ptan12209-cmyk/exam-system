-- ============================================================================
-- Run ONLY after wipe/dedupe of online_folders (no path duplicates).
-- Creates unique (examhub_course_key, subject, source_path)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_folders_course_subject_path
  ON public.online_folders (examhub_course_key, subject, source_path)
  WHERE examhub_course_key IS NOT NULL AND source_path IS NOT NULL;
