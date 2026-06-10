-- ============================================================================
-- MIGRATION: ADD HIERARCHY FIELDS TO EXAMS TABLE
-- Phân tầng đề thi theo: Môn → Chương → Bài → Phần
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add hierarchy columns to exams table
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.study_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.study_lessons(id) ON DELETE SET NULL;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.study_sections(id) ON DELETE SET NULL;

-- 2. Create Indexes for optimized query
CREATE INDEX IF NOT EXISTS idx_exams_chapter ON public.exams(chapter_id);
CREATE INDEX IF NOT EXISTS idx_exams_lesson ON public.exams(lesson_id);
CREATE INDEX IF NOT EXISTS idx_exams_section ON public.exams(section_id);

-- ============================================================================
-- DONE! Now exams can be categorized by chapter/lesson/section
-- ============================================================================
