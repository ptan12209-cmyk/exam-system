-- Migration: Exam Retake & Teacher Whitelist
-- Run this in Supabase SQL Editor

-- 1. Add max_attempts to exams table
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1;

-- COMMENT: max_attempts = 1 means students can only take once (default)
-- max_attempts = 0 means unlimited retakes
-- max_attempts = N means students can take up to N times

-- 2. Add attempt_number to submissions table to track retakes
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;

-- 3. Create teacher_whitelist table for authorized teacher emails
CREATE TABLE IF NOT EXISTS public.teacher_whitelist (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    added_by uuid REFERENCES auth.users,
    added_at timestamptz DEFAULT now(),
    note text
);

-- 4. Enable RLS
ALTER TABLE public.teacher_whitelist ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for teacher_whitelist
-- Only authenticated users can read (to check if they're a teacher)
CREATE POLICY "Authenticated users can view whitelist" ON public.teacher_whitelist
    FOR SELECT TO authenticated USING (true);

-- Only existing teachers (those in whitelist) can add new teachers
CREATE POLICY "Teachers can add to whitelist" ON public.teacher_whitelist
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teacher_whitelist 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- 6. Insert default teacher emails (CUSTOMIZE THESE!)
INSERT INTO public.teacher_whitelist (email, note) VALUES
    ('ptan12209@gmail.com', 'Admin teacher'),
    ('accmua1m@gmail.com', 'Default teacher')
ON CONFLICT (email) DO NOTHING;

-- 7. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_whitelist_email ON public.teacher_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student ON public.submissions(exam_id, student_id);

-- 8. Helper function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher(user_email text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.teacher_whitelist WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
