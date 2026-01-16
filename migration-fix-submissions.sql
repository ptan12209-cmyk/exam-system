-- Migration: Add missing columns for exam submissions
-- Run this in Supabase SQL Editor IMMEDIATELY to fix submission bug

-- Add session tracking columns
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cheat_flags jsonb DEFAULT '{}';

-- Add detailed answer columns (for new question types)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS mc_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tf_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sa_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;

-- Add if not exists
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS time_spent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_count integer DEFAULT 0;

COMMENT ON COLUMN public.submissions.session_id IS 'Optional session ID for ranked exams';
COMMENT ON COLUMN public.submissions.is_ranked IS 'Whether this submission counts for leaderboard';
COMMENT ON COLUMN public.submissions.cheat_flags IS 'Cheat detection data {tab_switches, multi_browser, etc}';
