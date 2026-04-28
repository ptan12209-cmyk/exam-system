-- =============================================
-- SECURITY PATCH MIGRATION
-- Fixes critical RLS vulnerabilities exposing answers
-- Adds indexes for scalability
-- =============================================

-- 1. FIX EXAMS RLS VULNERABILITY
-- Drop the dangerous policy that exposes correct_answers to all students
DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON public.exams;

-- Recreate policy to ONLY allow selecting SAFE columns
-- Note: Supabase RLS policies don't easily restrict columns, we use view or just rely on API.
-- However, for RLS we just drop it and force clients to use the secure /api/exams/[id]/questions endpoint!
-- Wait, if we drop it, the Leaderboard query (which joins exams) might fail if it relies on client-side join.
-- Actually, the get_leaderboard RPC uses SECURITY DEFINER, so it bypasses RLS!
-- But let's create a restricted policy just in case the client needs to fetch basic exam info.
CREATE POLICY "View published exam basic info"
  ON public.exams FOR SELECT
  USING (status = 'published');

-- Wait, the policy above still exposes all columns!
-- To truly secure it, we must revoke SELECT on the sensitive columns from the `authenticated` role.
-- BUT revoking column privileges can be messy. Instead, we remove the RLS policy entirely for `student`,
-- OR we just rely on the fact that we can't easily restrict columns via RLS in PostgREST without a View.
-- So the BEST approach: ONLY Teacher can SELECT exams via Supabase client. Students MUST use the API.

DROP POLICY IF EXISTS "View published exam basic info" ON public.exams;

-- 2. FIX SUBMISSIONS RLS VULNERABILITY
-- Drop the dangerous policy that allows students to view OTHER students' submissions (student_answers)
DROP POLICY IF EXISTS "View leaderboard for published exams" ON public.submissions;

-- 3. ADD MISSING INDEXES FOR SCALABILITY
CREATE INDEX IF NOT EXISTS idx_student_stats_xp ON public.student_stats (xp DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_score ON public.submissions (exam_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_exam_student ON public.submission_audit_log (exam_id, student_id);
