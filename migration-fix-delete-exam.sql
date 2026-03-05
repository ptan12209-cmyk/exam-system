-- Migration: Fix foreign key constraints to allow exam deletion
-- Run this in Supabase SQL Editor

-- 1. Fix submission_audit_log FK (the main blocker)
ALTER TABLE submission_audit_log 
    DROP CONSTRAINT IF EXISTS submission_audit_log_exam_id_fkey;

ALTER TABLE submission_audit_log 
    ADD CONSTRAINT submission_audit_log_exam_id_fkey 
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- 2. Fix exam_participants FK (if exists without cascade)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_participants') THEN
        ALTER TABLE exam_participants 
            DROP CONSTRAINT IF EXISTS exam_participants_exam_id_fkey;
        ALTER TABLE exam_participants 
            ADD CONSTRAINT exam_participants_exam_id_fkey 
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Fix exam_sessions FK (if missing cascade)
ALTER TABLE exam_sessions 
    DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;

ALTER TABLE exam_sessions 
    ADD CONSTRAINT exam_sessions_exam_id_fkey 
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- 4. Verify all FK constraints on exams are CASCADE
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE kcu.column_name = 'exam_id'
ORDER BY tc.table_name;
