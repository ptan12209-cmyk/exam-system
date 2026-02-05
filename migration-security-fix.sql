-- =============================================
-- SECURITY FIX MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create secure function to get leaderboard (hides student_answers)
CREATE OR REPLACE FUNCTION get_exam_leaderboard(exam_uuid UUID)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    score NUMERIC(5,2),
    time_spent INTEGER,
    submitted_at TIMESTAMPTZ,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.student_id,
        p.full_name as student_name,
        s.score,
        s.time_spent,
        s.submitted_at,
        ROW_NUMBER() OVER (ORDER BY s.score DESC, s.time_spent ASC) as rank
    FROM submissions s
    JOIN profiles p ON s.student_id = p.id
    WHERE s.exam_id = exam_uuid
    AND s.is_ranked = true
    ORDER BY s.score DESC, s.time_spent ASC
    LIMIT 100;
END;
$$;

-- 2. Create secure function to get exam for students (without answers)
CREATE OR REPLACE FUNCTION get_exam_for_student(exam_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    duration INTEGER,
    total_questions INTEGER,
    pdf_url TEXT,
    is_scheduled BOOLEAN,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    max_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.duration,
        e.total_questions,
        e.pdf_url,
        e.is_scheduled,
        e.start_time,
        e.end_time,
        e.max_attempts
    FROM exams e
    WHERE e.id = exam_uuid
    AND e.status = 'published';
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_exam_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exam_for_student(UUID) TO authenticated;

-- =============================================
-- NOTE: The following are RECOMMENDED but may break existing functionality
-- Only run after testing the new API routes work correctly
-- =============================================

-- OPTIONAL: Restrict what columns students can see from exams table
-- This prevents direct access to answer keys via RLS
-- 
-- DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON exams;
-- 
-- CREATE POLICY "Published exams basic info only"
--   ON exams FOR SELECT
--   USING (
--     status = 'published' 
--     OR teacher_id = auth.uid()
--   );
-- 
-- Note: With the new API approach, the client no longer directly queries
-- the exams table for students taking exams, so this is extra protection.

-- =============================================
-- RECOMMENDED: Audit log for suspicious submissions
-- =============================================

CREATE TABLE IF NOT EXISTS submission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id),
    exam_id UUID REFERENCES exams(id),
    student_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE submission_audit_log ENABLE ROW LEVEL SECURITY;

-- Only teachers can view audit logs for their exams
CREATE POLICY "Teachers can view audit logs"
    ON submission_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.id = submission_audit_log.exam_id
            AND exams.teacher_id = auth.uid()
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
    ON submission_audit_log FOR INSERT
    WITH CHECK (true);
