-- ============================================================================
-- Migration: Add multi-assets support to online lessons (multiple videos & documents)
-- ============================================================================

-- 1. Add jsonb columns for multiple videos and documents
ALTER TABLE public.online_lessons ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.online_lessons ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- 2. Migrate existing data from video_url (text) to videos (jsonb array)
UPDATE public.online_lessons 
SET videos = jsonb_build_array(jsonb_build_object('title', 'Video bài học', 'url', video_url))
WHERE video_url IS NOT NULL AND video_url <> '' AND (videos IS NULL OR jsonb_array_length(videos) = 0);

-- 3. Migrate existing data from document_url (text) to documents (jsonb array)
UPDATE public.online_lessons 
SET documents = jsonb_build_array(jsonb_build_object('title', 'Tài liệu bài học', 'url', document_url))
WHERE document_url IS NOT NULL AND document_url <> '' AND (documents IS NULL OR jsonb_array_length(documents) = 0);
