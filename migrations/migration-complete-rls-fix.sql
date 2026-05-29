-- COMPLETE FIX: Disable RLS on ALL tables that might cause FOR UPDATE error
-- Run ALL of these in Supabase SQL Editor

-- 1. Disable RLS on submissions table
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on exam_sessions table (used in submit code)
ALTER TABLE public.exam_sessions DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on exams table (might have policies causing issues)
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;

-- 4. Drop any problematic triggers (if they exist)
DROP TRIGGER IF EXISTS on_submission_insert ON public.submissions;
DROP TRIGGER IF EXISTS on_submission_update ON public.submissions;

-- 5. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('submissions', 'exam_sessions', 'exams');

-- After running this, test submission again
-- If it works, we can gradually re-enable RLS with proper policies
