-- ============================================================================
-- Add question_type to questions table (True/False, Short Answer support)
-- ============================================================================

-- Add question_type column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type text 
    DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer'));

-- short_answer needs different validation - correct_answer can be longer text
-- true_false: correct_answer is 'Đ' or 'S'
-- multiple_choice: correct_answer is 'A', 'B', 'C', 'D'

COMMENT ON COLUMN questions.question_type IS 'Type of question: multiple_choice, true_false, or short_answer';

-- Update existing questions to have explicit type
UPDATE questions SET question_type = 'multiple_choice' WHERE question_type IS NULL;
