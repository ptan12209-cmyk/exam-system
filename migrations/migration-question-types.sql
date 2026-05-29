-- Migration: Add question types support
-- Run this in Supabase SQL Editor

-- Add answer type columns to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS mc_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_answers jsonb DEFAULT '[]';

-- mc_answers: [{"question": 1, "answer": "D"}, ...]
-- tf_answers: [{"question": 13, "a": true, "b": true, "c": false, "d": true}, ...]
-- sa_answers: [{"question": 17, "answer": 18}, ...]

-- Update submissions table for different answer types
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_student_answers jsonb DEFAULT '[]';

-- Add score breakdown
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tf_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sa_correct integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);

COMMENT ON COLUMN public.exams.mc_answers IS 'Multiple choice answers (A/B/C/D)';
COMMENT ON COLUMN public.exams.tf_answers IS 'True/False (Đúng/Sai) answers with 4 sub-questions each';
COMMENT ON COLUMN public.exams.sa_answers IS 'Short answer (numeric) with tolerance range';
