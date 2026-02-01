-- =====================================================
-- MIGRATION: Ensure questions table has all columns + verify data
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add missing columns to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '["A","B","C","D"]';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Check what data exists
SELECT 
    e.id as exam_id,
    e.title,
    jsonb_array_length(e.questions) as questions_count,
    (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as synced_count
FROM exams e
WHERE e.questions IS NOT NULL
ORDER BY e.created_at DESC
LIMIT 5;

-- 3. If synced_count is 0, manually insert one exam's questions as test
-- Replace 'YOUR_EXAM_ID' with an actual exam ID from the query above
DO $$
DECLARE
    test_exam_id UUID;
    question_data JSONB;
    i INTEGER := 1;
BEGIN
    -- Get first exam with questions
    SELECT id INTO test_exam_id
    FROM exams 
    WHERE questions IS NOT NULL 
    AND jsonb_array_length(questions) > 0
    LIMIT 1;
    
    IF test_exam_id IS NOT NULL THEN
        -- Delete existing questions
        DELETE FROM questions WHERE exam_id = test_exam_id;
        
        -- Insert from JSONB
        FOR question_data IN 
            SELECT * FROM jsonb_array_elements((SELECT questions FROM exams WHERE id = test_exam_id))
        LOOP
            INSERT INTO questions (exam_id, question_text, options, correct_answer, order_index)
            VALUES (
                test_exam_id,
                COALESCE(question_data->>'question', 'Câu ' || i::TEXT),
                COALESCE(question_data->'options', '["A","B","C","D"]'::JSONB),
                CASE 
                    WHEN question_data->>'answer' = 'A' THEN 0
                    WHEN question_data->>'answer' = 'B' THEN 1
                    WHEN question_data->>'answer' = 'C' THEN 2
                    WHEN question_data->>'answer' = 'D' THEN 3
                    ELSE 0
                END,
                i
            );
            i := i + 1;
        END LOOP;
        
        RAISE NOTICE 'Successfully synced % questions for exam %', i-1, test_exam_id;
    END IF;
END $$;

-- 4. Verify the result
SELECT COUNT(*) as total_questions FROM questions;

-- =====================================================
-- DONE! Check the output to see if questions were synced
-- =====================================================
