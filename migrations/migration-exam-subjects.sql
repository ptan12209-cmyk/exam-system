-- =============================================
-- EXAM SUBJECTS - Phân loại đề thi theo môn học
-- Run this in Supabase SQL Editor
-- =============================================

-- Add subject column to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'other';

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_exams_subject ON public.exams(subject);

-- Update RLS policies to allow reading subject field (already covered by existing policies)
-- No additional RLS changes needed since subject is just a column on exams table

-- =============================================
-- DONE! Run this in Supabase SQL Editor
-- =============================================
