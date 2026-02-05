-- =============================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 2.1 DATABASE INDEXES
-- =============================================

-- Submissions table indexes (most critical for leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student 
    ON submissions(exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_score 
    ON submissions(exam_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_ranked 
    ON submissions(exam_id, is_ranked, score DESC) 
    WHERE is_ranked = true;

CREATE INDEX IF NOT EXISTS idx_submissions_student_recent 
    ON submissions(student_id, submitted_at DESC);

-- Exams table indexes
CREATE INDEX IF NOT EXISTS idx_exams_status_created 
    ON exams(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exams_teacher_status 
    ON exams(teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_exams_published 
    ON exams(status) 
    WHERE status = 'published';

-- Exam sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_exam_student 
    ON exam_sessions(exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_student_active 
    ON exam_sessions(student_id, status) 
    WHERE status = 'in_progress';

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
    ON profiles(role);

-- Audit log indexes (for admin queries)
CREATE INDEX IF NOT EXISTS idx_audit_exam 
    ON submission_audit_log(exam_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_student 
    ON submission_audit_log(student_id, created_at DESC);

-- =============================================
-- ANALYZE TABLES (Update statistics for query planner)
-- =============================================
ANALYZE submissions;
ANALYZE exams;
ANALYZE exam_sessions;
ANALYZE profiles;

-- =============================================
-- OPTIONAL: Create materialized view for leaderboard (faster reads)
-- Uncomment if you have high traffic on leaderboards
-- =============================================

-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_exam_leaderboards AS
-- SELECT 
--     s.exam_id,
--     s.student_id,
--     p.full_name as student_name,
--     p.avatar_url,
--     s.score,
--     s.time_spent,
--     s.submitted_at,
--     ROW_NUMBER() OVER (
--         PARTITION BY s.exam_id 
--         ORDER BY s.score DESC, s.time_spent ASC
--     ) as rank
-- FROM submissions s
-- JOIN profiles p ON s.student_id = p.id
-- WHERE s.is_ranked = true;

-- CREATE UNIQUE INDEX ON mv_exam_leaderboards(exam_id, student_id);
-- CREATE INDEX ON mv_exam_leaderboards(exam_id, rank);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exam_leaderboards;
