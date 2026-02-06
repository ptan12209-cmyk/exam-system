-- =============================================
-- DIAGNOSTIC: Check why stats show 0
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Check submissions table
SELECT 
    'Total submissions' as check_name, 
    COUNT(*) as result 
FROM submissions;

-- 2. Check submissions by student
SELECT 
    s.student_id,
    p.full_name,
    COUNT(*) as submission_count,
    AVG(s.score) as avg_score,
    MAX(s.score) as best_score
FROM submissions s
LEFT JOIN profiles p ON p.id = s.student_id
GROUP BY s.student_id, p.full_name
ORDER BY submission_count DESC
LIMIT 10;

-- 3. Check student_stats table
SELECT 
    'Total student_stats records' as check_name, 
    COUNT(*) as result 
FROM student_stats;

-- 4. Check student_stats details
SELECT 
    ss.user_id,
    p.full_name,
    ss.xp,
    ss.level,
    ss.streak_days,
    ss.exams_completed,
    ss.perfect_scores
FROM student_stats ss
LEFT JOIN profiles p ON p.id = ss.user_id
LIMIT 10;

-- 5. Check if submissions exist but student_stats is empty
SELECT 
    'Students with submissions but no stats' as check_name,
    COUNT(DISTINCT s.student_id) as result
FROM submissions s
WHERE NOT EXISTS (
    SELECT 1 FROM student_stats ss WHERE ss.user_id = s.student_id
);

-- 6. Check profiles table
SELECT 
    'Total profiles' as check_name,
    COUNT(*) as result
FROM profiles;

-- 7. Check exams table
SELECT 
    'Published exams' as check_name,
    COUNT(*) as result
FROM exams WHERE status = 'published';

-- =============================================
-- FIX: Sync student_stats from submissions 
-- (Uncomment and run if stats are missing)
-- =============================================

-- Create/update student_stats based on actual submissions
INSERT INTO student_stats (user_id, xp, level, streak_days, exams_completed, perfect_scores)
SELECT 
    s.student_id,
    COALESCE(SUM(CASE WHEN s.score >= 5 THEN 50 ELSE 20 END), 0) as xp,
    1 as level,
    0 as streak_days,
    COUNT(*) as exams_completed,
    COUNT(CASE WHEN s.score = 10 THEN 1 END) as perfect_scores
FROM submissions s
GROUP BY s.student_id
ON CONFLICT (user_id) DO UPDATE SET
    exams_completed = EXCLUDED.exams_completed,
    perfect_scores = EXCLUDED.perfect_scores,
    xp = EXCLUDED.xp;
