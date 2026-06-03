-- ============================================================================
-- MIGRATION: STUDY MATERIALS & GRADE SEGMENTATION (6-12)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Upgrade public.profiles to add structured grade (6-12) and class suffix
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade integer CHECK (grade BETWEEN 6 AND 12);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_suffix text;

-- 2. Upgrade public.exams to support grade & class segmentation
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS target_grade integer CHECK (target_grade BETWEEN 6 AND 12);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS target_classes text[]; -- Specific class names (e.g. ['12A1', '12A2']), NULL = entire grade

-- 3. Create public.study_chapters
CREATE TABLE IF NOT EXISTS public.study_chapters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL CHECK (subject IN ('math', 'physics', 'chemistry', 'english', 'literature', 'biology', 'history', 'geography', 'civic_education', 'informatics', 'aptitude_test', 'other')),
    grade integer NOT NULL CHECK (grade BETWEEN 6 AND 12),
    title text NOT NULL,
    order_index integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- 4. Create public.study_lessons
CREATE TABLE IF NOT EXISTS public.study_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id uuid REFERENCES public.study_chapters(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    order_index integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- 5. Create public.study_materials
CREATE TABLE IF NOT EXISTS public.study_materials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.study_lessons(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    type text NOT NULL CHECK (type IN ('video', 'document')),
    url text NOT NULL, -- YouTube Embed URL or PDF URL
    description text,
    uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Allow users to view chapters" ON public.study_chapters;
CREATE POLICY "Allow users to view chapters" ON public.study_chapters
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() 
            AND (p.role IN ('teacher', 'admin', 'parent') OR p.grade = study_chapters.grade)
        )
    );

DROP POLICY IF EXISTS "Allow teachers to manage chapters" ON public.study_chapters;
CREATE POLICY "Allow teachers to manage chapters" ON public.study_chapters
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow users to view lessons" ON public.study_lessons;
CREATE POLICY "Allow users to view lessons" ON public.study_lessons
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_chapters c
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE c.id = study_lessons.chapter_id
            AND (p.role IN ('teacher', 'admin', 'parent') OR p.grade = c.grade)
        )
    );

DROP POLICY IF EXISTS "Allow teachers to manage lessons" ON public.study_lessons;
CREATE POLICY "Allow teachers to manage lessons" ON public.study_lessons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow users to view materials" ON public.study_materials;
CREATE POLICY "Allow users to view materials" ON public.study_materials
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_lessons l
            JOIN public.study_chapters c ON c.id = l.chapter_id
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE l.id = study_materials.lesson_id
            AND (p.role IN ('teacher', 'admin', 'parent') OR p.grade = c.grade)
        )
    );

DROP POLICY IF EXISTS "Allow teachers to manage materials" ON public.study_materials;
CREATE POLICY "Allow teachers to manage materials" ON public.study_materials
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

-- 7. Data Migration SQL: Parse legacy student classes
-- Detects numbers 6 to 12 in the original `class` text and sets the target `grade`.
-- The original `class` value is retained in `class_suffix` for consistency.
-- Use ^ anchor to match grade number at the START of the class string.
-- This prevents '10A12' from matching '12' first.
UPDATE public.profiles
SET
  grade = CASE
    WHEN class ~ '^12' THEN 12
    WHEN class ~ '^11' THEN 11
    WHEN class ~ '^10' THEN 10
    WHEN class ~ '^9' THEN 9
    WHEN class ~ '^8' THEN 8
    WHEN class ~ '^7' THEN 7
    WHEN class ~ '^6' THEN 6
    ELSE NULL
  END,
  class_suffix = COALESCE(class, '')
WHERE role = 'student' AND (class IS NOT NULL OR grade IS NULL);
