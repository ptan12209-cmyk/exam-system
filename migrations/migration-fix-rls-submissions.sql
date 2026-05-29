-- Fix RLS policy to prevent FOR UPDATE error
-- Run this in Supabase SQL Editor

-- First, check current policies
-- SELECT * FROM pg_policies WHERE tablename = 'submissions';

-- Option 1: Temporarily disable RLS (NOT recommended for production)
-- ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- Option 2: Drop problematic policies and recreate without FOR UPDATE

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their exams" ON public.submissions;

-- Recreate policies without FOR UPDATE issues
CREATE POLICY "Students can view own submissions" 
ON public.submissions FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own submissions" 
ON public.submissions FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own submissions" 
ON public.submissions FOR UPDATE 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their exams" 
ON public.submissions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.exams 
        WHERE exams.id = submissions.exam_id 
        AND exams.teacher_id = auth.uid()
    )
);

-- Make sure RLS is enabled
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
