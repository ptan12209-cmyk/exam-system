-- COMPLETE FIX: Disable RLS on ALL tables that might cause FOR UPDATE error
-- Run ALL of these in Supabase SQL Editor

-- 1. Disable RLS on submissions table (high concurrency)
ALTER TABLE IF EXISTS public.submissions DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on exam_sessions table (used in submit code, high concurrency)
ALTER TABLE IF EXISTS public.exam_sessions DISABLE ROW LEVEL SECURITY;

-- 3. Disable RLS on exams table (might have policies causing issues)
ALTER TABLE IF EXISTS public.exams DISABLE ROW LEVEL SECURITY;

-- 4. Disable RLS on student_stats table (updated frequently, has FOR UPDATE policy)
ALTER TABLE IF EXISTS public.student_stats DISABLE ROW LEVEL SECURITY;

-- 5. Disable RLS on user_subscriptions table (has FOR UPDATE policy)
ALTER TABLE IF EXISTS public.user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 6. Disable RLS on profiles table (central table, has FOR UPDATE policy)
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- 7. Disable RLS on daily_logins table (updated on login)
ALTER TABLE IF EXISTS public.daily_logins DISABLE ROW LEVEL SECURITY;

-- 8. Drop any problematic triggers (if they exist)
DROP TRIGGER IF EXISTS on_submission_insert ON public.submissions;
DROP TRIGGER IF EXISTS on_submission_update ON public.submissions;

-- 9. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'submissions',
  'exam_sessions',
  'exams',
  'student_stats',
  'user_subscriptions',
  'profiles',
  'daily_logins'
);

-- After running this, test submission again
-- If it works, we can gradually re-enable RLS with proper policies
