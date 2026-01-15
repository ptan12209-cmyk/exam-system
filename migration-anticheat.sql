-- Migration: Add anti-cheat tracking columns
-- Run this in Supabase SQL Editor

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS tab_switches integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fullscreen_exits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS copy_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS violations jsonb DEFAULT '[]';

-- violations: Array of {type: 'tab_switch'|'fullscreen_exit'|'copy_attempt', timestamp: '...'}

COMMENT ON COLUMN public.submissions.tab_switches IS 'Number of times student switched tabs during exam';
COMMENT ON COLUMN public.submissions.fullscreen_exits IS 'Number of times student exited fullscreen during exam';
COMMENT ON COLUMN public.submissions.violations IS 'Detailed log of all violations with timestamps';
