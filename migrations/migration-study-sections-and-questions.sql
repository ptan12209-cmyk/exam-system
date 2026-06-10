-- ============================================================================
-- MIGRATION: STUDY SECTIONS & QUESTIONS TAXONOMY HIERARCHY
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create public.study_sections (Phần học)
CREATE TABLE IF NOT EXISTS public.study_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.study_lessons(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    order_index integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on study_sections
ALTER TABLE public.study_sections ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for study_sections
DROP POLICY IF EXISTS "Allow users to view sections" ON public.study_sections;
CREATE POLICY "Allow users to view sections" ON public.study_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_lessons l
            JOIN public.study_chapters c ON c.id = l.chapter_id
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE l.id = study_sections.lesson_id
            AND (p.role IN ('teacher', 'admin', 'parent') OR p.grade = c.grade)
        )
    );

DROP POLICY IF EXISTS "Allow teachers to manage sections" ON public.study_sections;
CREATE POLICY "Allow teachers to manage sections" ON public.study_sections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

-- 4. Update public.questions to support categorization
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.study_chapters(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.study_lessons(id) ON DELETE SET NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.study_sections(id) ON DELETE SET NULL;

-- 5. Create Indexes for optimized query execution
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson ON public.questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_section ON public.questions(section_id);

-- 6. Trigger to automatically create "Bài tập khảo sát chất lượng" and "Đề khảo sát chất lượng toàn chương" on new chapters
CREATE OR REPLACE FUNCTION public.handle_new_chapter()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert "Bài tập khảo sát chất lượng"
    INSERT INTO public.study_lessons (chapter_id, title, order_index)
    VALUES (NEW.id, 'Bài tập khảo sát chất lượng', 998);
    
    -- Insert "Đề khảo sát chất lượng toàn chương"
    INSERT INTO public.study_lessons (chapter_id, title, order_index)
    VALUES (NEW.id, 'Đề khảo sát chất lượng toàn chương', 999);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_chapter_created ON public.study_chapters;
CREATE TRIGGER tr_on_chapter_created
    AFTER INSERT ON public.study_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_chapter();

-- 7. Add these two special lessons to ALL existing chapters if they don't exist
INSERT INTO public.study_lessons (chapter_id, title, order_index)
SELECT id, 'Bài tập khảo sát chất lượng', 998
FROM public.study_chapters c
WHERE NOT EXISTS (
    SELECT 1 FROM public.study_lessons l 
    WHERE l.chapter_id = c.id AND l.title = 'Bài tập khảo sát chất lượng'
);

INSERT INTO public.study_lessons (chapter_id, title, order_index)
SELECT id, 'Đề khảo sát chất lượng toàn chương', 999
FROM public.study_chapters c
WHERE NOT EXISTS (
    SELECT 1 FROM public.study_lessons l 
    WHERE l.chapter_id = c.id AND l.title = 'Đề khảo sát chất lượng toàn chương'
);

-- 8. Auto-categorize existing questions that are currently uncategorized
DO $$
DECLARE
    sub_rec RECORD;
    v_chap_id uuid;
    v_les_id uuid;
    v_sec_id uuid;
    v_db_sub text;
BEGIN
    -- Iterate over all unique subjects present in question_banks
    FOR sub_rec IN 
        SELECT DISTINCT subject FROM public.question_banks
    LOOP
        -- Map frontend subject to DB subject
        v_db_sub := CASE sub_rec.subject
            WHEN 'toan' THEN 'math'
            WHEN 'ly' THEN 'physics'
            WHEN 'hoa' THEN 'chemistry'
            WHEN 'sinh' THEN 'biology'
            WHEN 'anh' THEN 'english'
            WHEN 'van' THEN 'literature'
            WHEN 'su' THEN 'history'
            WHEN 'dia' THEN 'geography'
            WHEN 'gdcd' THEN 'civic_education'
            WHEN 'tin' THEN 'informatics'
            WHEN 'dgnl' THEN 'aptitude_test'
            ELSE 'other'
        END;

        -- Find or create a default chapter for this subject (Grade 12)
        SELECT id INTO v_chap_id 
        FROM public.study_chapters 
        WHERE subject = v_db_sub AND grade = 12
        ORDER BY order_index ASC
        LIMIT 1;

        IF v_chap_id IS NULL THEN
            INSERT INTO public.study_chapters (subject, grade, title, order_index)
            VALUES (v_db_sub, 12, 'Chương 1: Ôn tập tổng hợp', 1)
            RETURNING id INTO v_chap_id;
        END IF;

        -- Find or create a default lesson for this chapter (or use 'Bài tập khảo sát chất lượng')
        SELECT id INTO v_les_id 
        FROM public.study_lessons 
        WHERE chapter_id = v_chap_id AND title = 'Bài tập khảo sát chất lượng'
        LIMIT 1;

        IF v_les_id IS NULL THEN
            INSERT INTO public.study_lessons (chapter_id, title, order_index)
            VALUES (v_chap_id, 'Bài tập khảo sát chất lượng', 998)
            RETURNING id INTO v_les_id;
        END IF;

        -- Find or create a default section for this lesson
        SELECT id INTO v_sec_id 
        FROM public.study_sections 
        WHERE lesson_id = v_les_id
        ORDER BY order_index ASC
        LIMIT 1;

        IF v_sec_id IS NULL THEN
            INSERT INTO public.study_sections (lesson_id, title, order_index)
            VALUES (v_les_id, 'Phần 1: Luyện tập tổng hợp', 1)
            RETURNING id INTO v_sec_id;
        END IF;

        -- Update all uncategorized questions belonging to banks of this subject
        UPDATE public.questions q
        SET chapter_id = v_chap_id,
            lesson_id = v_les_id,
            section_id = v_sec_id
        FROM public.question_banks b
        WHERE q.bank_id = b.id
          AND b.subject = sub_rec.subject
          AND q.chapter_id IS NULL;
    END LOOP;
END $$;
