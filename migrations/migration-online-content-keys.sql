-- ============================================================================
-- Migration: Hidden stable keys for online study folders/lessons
-- content_key / folder_key — machine IDs for idempotent Bunny→ExamHub sync
-- Run in Supabase SQL Editor AFTER deploy of import code that writes these columns.
-- Prefer: wipe tree then create unique indexes if legacy dups exist.
-- ============================================================================

ALTER TABLE public.online_lessons
  ADD COLUMN IF NOT EXISTS content_key text;

ALTER TABLE public.online_folders
  ADD COLUMN IF NOT EXISTS folder_key text;

COMMENT ON COLUMN public.online_lessons.content_key IS
  'Stable machine id: v:stream:{lib}:{id} | v:drive:{id} | d:drive:{id} | d:bunny:{sha1} — not shown in UI';

COMMENT ON COLUMN public.online_folders.folder_key IS
  'Stable machine id: f:{courseKey}:{dbSubject}:root | f:{courseKey}:{dbSubject}:{sha1(path)} — not shown in UI';

-- Partial unique indexes (NULL allowed for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_online_lessons_content_key
  ON public.online_lessons (content_key)
  WHERE content_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_folders_folder_key
  ON public.online_folders (folder_key)
  WHERE folder_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_lessons_bunny_video
  ON public.online_lessons (source_bunny_video_id)
  WHERE source_bunny_video_id IS NOT NULL;

-- One folder node per (course, subject, path) — create after wipe if dups blocked
CREATE UNIQUE INDEX IF NOT EXISTS uq_online_folders_course_subject_path
  ON public.online_folders (examhub_course_key, subject, source_path)
  WHERE examhub_course_key IS NOT NULL AND source_path IS NOT NULL;
