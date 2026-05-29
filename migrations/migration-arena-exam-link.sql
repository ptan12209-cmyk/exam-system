-- ============================================================================
-- Migration: Arena uses Exams instead of individual Questions
-- ============================================================================

-- 1. Add exam_id to arena_sessions (link arena to specific exam)
ALTER TABLE arena_sessions 
ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES exams(id) ON DELETE SET NULL;

-- 2. Remove subject column (will use exam's subject instead)
-- Keep for now as fallback, can remove later
-- ALTER TABLE arena_sessions DROP COLUMN IF EXISTS subject;

-- 3. Remove total_questions (will use exam's question count)
-- Keep for now as fallback

-- 4. Drop questions table (no longer needed)
-- UNCOMMENT BELOW TO DROP - BE CAREFUL!
-- DROP TABLE IF EXISTS questions CASCADE;

-- 5. Update arena_results to store exam_id for easier querying
-- (arena_id already references arena_sessions which now has exam_id)

COMMENT ON COLUMN arena_sessions.exam_id IS 'Reference to the exam used in this arena session';
