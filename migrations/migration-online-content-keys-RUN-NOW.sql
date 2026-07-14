-- ============================================================================
-- RUN THIS NOW in Supabase SQL Editor (safe with current dups)
-- Adds content_key / folder_key + safe unique indexes.
-- Does NOT create path unique index (that fails on dups until wipe).
-- ============================================================================

ALTER TABLE public.online_lessons
  ADD COLUMN IF NOT EXISTS content_key text;

ALTER TABLE public.online_folders
  ADD COLUMN IF NOT EXISTS folder_key text;

COMMENT ON COLUMN public.online_lessons.content_key IS
  'Stable machine id — not shown in UI';

COMMENT ON COLUMN public.online_folders.folder_key IS
  'Stable machine id — not shown in UI';

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_lessons_content_key
  ON public.online_lessons (content_key)
  WHERE content_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_folders_folder_key
  ON public.online_folders (folder_key)
  WHERE folder_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_online_lessons_bunny_video
  ON public.online_lessons (source_bunny_video_id)
  WHERE source_bunny_video_id IS NOT NULL;
