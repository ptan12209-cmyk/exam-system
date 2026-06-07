-- ============================================================================
-- MIGRATION: IELTS PRACTICE MODULE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create public.ielts_tests
CREATE TABLE IF NOT EXISTS public.ielts_tests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,                          -- e.g., "Cambridge IELTS 18 - Test 1"
    description text,
    skill text NOT NULL CHECK (skill IN ('reading', 'listening', 'writing')),
    timer_mode text NOT NULL DEFAULT 'standard' CHECK (timer_mode IN ('standard', 'custom')),
    duration integer NOT NULL CHECK (duration > 0), -- in minutes
    total_questions integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create public.ielts_sections
CREATE TABLE IF NOT EXISTS public.ielts_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid REFERENCES public.ielts_tests(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,                          -- e.g., "Section 1" / "Passage 1" / "Task 1"
    order_index integer NOT NULL DEFAULT 1,
    
    -- Reading specific
    passage_content text,                         -- Passage content (HTML / Rich text)
    
    -- Listening specific  
    audio_url text,                               -- Audio URL (Supabase Storage or YouTube)
    audio_source text CHECK (audio_source IS NULL OR audio_source IN ('upload', 'youtube', 'external')),
    
    -- Writing specific
    writing_prompt text,                          -- Writing task prompt
    writing_task_type text CHECK (writing_task_type IS NULL OR writing_task_type IN ('task1', 'task2')),
    writing_image_url text,                       -- Chart/map image URL for Task 1
    min_words integer,                            -- e.g., 150 or 250
    
    created_at timestamptz DEFAULT now()
);

-- 3. Create public.ielts_questions (Only for Reading & Listening)
CREATE TABLE IF NOT EXISTS public.ielts_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES public.ielts_sections(id) ON DELETE CASCADE NOT NULL,
    question_number integer NOT NULL,
    question_type text NOT NULL CHECK (question_type IN (
        'multiple_choice',
        'true_false_ng',
        'yes_no_ng',
        'fill_blank',
        'matching',
        'short_answer',
        'sentence_completion',
        'diagram_label',
        'heading_match'
    )),
    question_text text NOT NULL,
    options jsonb,                                -- Multiple choice options or matching list
    correct_answer text NOT NULL,                 -- Correct answer
    explanation text,
    
    created_at timestamptz DEFAULT now(),
    UNIQUE(section_id, question_number)
);

-- 4. Create public.ielts_submissions
CREATE TABLE IF NOT EXISTS public.ielts_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id uuid REFERENCES public.ielts_tests(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    answers jsonb NOT NULL DEFAULT '[]',          -- [{question_id: uuid, answer: text}]
    writing_response text,                        -- Student's essay
    
    score numeric(4,1),                           -- Final score (calculated band / writing band)
    correct_count integer DEFAULT 0,
    total_questions integer DEFAULT 0,
    band_score numeric(3,1),                      -- Standard IELTS band score (e.g. 7.5)
    
    time_spent integer DEFAULT 0,                 -- in seconds
    started_at timestamptz DEFAULT now(),
    submitted_at timestamptz,
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    
    created_at timestamptz DEFAULT now()
);

-- 5. Create public.ielts_writing_scores (AI detailed feedback for Writing)
CREATE TABLE IF NOT EXISTS public.ielts_writing_scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid REFERENCES public.ielts_submissions(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    task_achievement numeric(3,1) NOT NULL CHECK (task_achievement BETWEEN 0 AND 9),
    coherence_cohesion numeric(3,1) NOT NULL CHECK (coherence_cohesion BETWEEN 0 AND 9),
    lexical_resource numeric(3,1) NOT NULL CHECK (lexical_resource BETWEEN 0 AND 9),
    grammar_accuracy numeric(3,1) NOT NULL CHECK (grammar_accuracy BETWEEN 0 AND 9),
    
    overall_band numeric(3,1) NOT NULL CHECK (overall_band BETWEEN 0 AND 9),
    
    feedback_task text,
    feedback_coherence text,
    feedback_lexical text,
    feedback_grammar text,
    feedback_overall text,
    
    sample_answer text,
    ai_model text DEFAULT 'gemini-2.0-flash',
    graded_at timestamptz DEFAULT now()
);

-- 6. Trigger to automatically update updated_at for ielts_tests
CREATE OR REPLACE FUNCTION public.update_ielts_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_update_ielts_tests_updated_at ON public.ielts_tests;
CREATE TRIGGER tr_update_ielts_tests_updated_at
    BEFORE UPDATE ON public.ielts_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ielts_tests_updated_at();

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ielts_tests_skill ON public.ielts_tests(skill);
CREATE INDEX IF NOT EXISTS idx_ielts_tests_status ON public.ielts_tests(status);
CREATE INDEX IF NOT EXISTS idx_ielts_sections_test ON public.ielts_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_ielts_questions_section ON public.ielts_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_ielts_submissions_student ON public.ielts_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_ielts_submissions_test ON public.ielts_submissions(test_id);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.ielts_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ielts_writing_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ielts_tests
DROP POLICY IF EXISTS "Allow teachers to manage tests" ON public.ielts_tests;
CREATE POLICY "Allow teachers to manage tests" ON public.ielts_tests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow students to view published tests" ON public.ielts_tests;
CREATE POLICY "Allow students to view published tests" ON public.ielts_tests
    FOR SELECT TO authenticated
    USING (
        status = 'published'
    );

-- RLS Policies for ielts_sections
DROP POLICY IF EXISTS "Allow teachers to manage sections" ON public.ielts_sections;
CREATE POLICY "Allow teachers to manage sections" ON public.ielts_sections
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow students to view sections of published tests" ON public.ielts_sections;
CREATE POLICY "Allow students to view sections of published tests" ON public.ielts_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ielts_tests t
            WHERE t.id = ielts_sections.test_id AND t.status = 'published'
        )
    );

-- RLS Policies for ielts_questions
DROP POLICY IF EXISTS "Allow teachers to manage questions" ON public.ielts_questions;
CREATE POLICY "Allow teachers to manage questions" ON public.ielts_questions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow students to view questions of published tests" ON public.ielts_questions;
CREATE POLICY "Allow students to view questions of published tests" ON public.ielts_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ielts_sections s
            JOIN public.ielts_tests t ON t.id = s.test_id
            WHERE s.id = ielts_questions.section_id AND t.status = 'published'
        )
    );

-- RLS Policies for ielts_submissions
DROP POLICY IF EXISTS "Allow teachers to view all submissions" ON public.ielts_submissions;
CREATE POLICY "Allow teachers to view all submissions" ON public.ielts_submissions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow students to manage own submissions" ON public.ielts_submissions;
CREATE POLICY "Allow students to manage own submissions" ON public.ielts_submissions
    FOR ALL TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- RLS Policies for ielts_writing_scores
DROP POLICY IF EXISTS "Allow teachers to view all writing scores" ON public.ielts_writing_scores;
CREATE POLICY "Allow teachers to view all writing scores" ON public.ielts_writing_scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow students to view own writing scores" ON public.ielts_writing_scores;
CREATE POLICY "Allow students to view own writing scores" ON public.ielts_writing_scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ielts_submissions s
            WHERE s.id = ielts_writing_scores.submission_id AND s.student_id = auth.uid()
        )
    );

-- INSERT/UPDATE policies cho ielts_writing_scores (cần thiết cho API chấm điểm)
DROP POLICY IF EXISTS "Allow teachers to manage writing scores" ON public.ielts_writing_scores;
CREATE POLICY "Allow teachers to manage writing scores" ON public.ielts_writing_scores
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

-- Cho phép student trigger AI chấm bài viết của chính mình
DROP POLICY IF EXISTS "Allow students to insert own writing scores" ON public.ielts_writing_scores;
CREATE POLICY "Allow students to insert own writing scores" ON public.ielts_writing_scores
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ielts_submissions s
            WHERE s.id = ielts_writing_scores.submission_id AND s.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow students to update own writing scores" ON public.ielts_writing_scores;
CREATE POLICY "Allow students to update own writing scores" ON public.ielts_writing_scores
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ielts_submissions s
            WHERE s.id = ielts_writing_scores.submission_id AND s.student_id = auth.uid()
        )
    );

-- 9. Storage Buckets and Policies
-- Create 'ielts' bucket for audio files and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ielts', 'ielts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow teachers to upload to ielts bucket" ON storage.objects;
CREATE POLICY "Allow teachers to upload to ielts bucket"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'ielts' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow teachers to update/delete from ielts bucket" ON storage.objects;
CREATE POLICY "Allow teachers to update/delete from ielts bucket"
    ON storage.objects FOR ALL TO authenticated
    USING (
        bucket_id = 'ielts' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Allow public read access to ielts bucket" ON storage.objects;
CREATE POLICY "Allow public read access to ielts bucket"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'ielts');
