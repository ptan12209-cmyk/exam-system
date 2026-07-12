-- ============================================================================
-- Migration: Online study import sources (Drive/Bunny sync from local downloader)
-- Run in Supabase SQL Editor
-- ============================================================================

-- Lesson source tracking (idempotent upsert by Drive file id)
ALTER TABLE public.online_lessons
  ADD COLUMN IF NOT EXISTS source_drive_file_id text,
  ADD COLUMN IF NOT EXISTS source_bunny_video_id text,
  ADD COLUMN IF NOT EXISTS source_remote_path text,
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_lessons_drive_file
  ON public.online_lessons (source_drive_file_id)
  WHERE source_drive_file_id IS NOT NULL;

-- Folder mapping for course tree sync
ALTER TABLE public.online_folders
  ADD COLUMN IF NOT EXISTS source_path text,
  ADD COLUMN IF NOT EXISTS examhub_course_key text;

CREATE INDEX IF NOT EXISTS idx_online_folders_course_key
  ON public.online_folders (examhub_course_key)
  WHERE examhub_course_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_online_folders_source_path
  ON public.online_folders (examhub_course_key, source_path)
  WHERE source_path IS NOT NULL;

-- Import audit log
CREATE TABLE IF NOT EXISTS public.online_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_key text,
  payload_summary jsonb,
  created_count int DEFAULT 0,
  updated_count int DEFAULT 0,
  skipped_count int DEFAULT 0,
  error_count int DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.online_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read import logs" ON public.online_import_logs;
CREATE POLICY "Staff can read import logs" ON public.online_import_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );
