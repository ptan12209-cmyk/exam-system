-- =============================================
-- MIGRATION: Score Visibility Configuration
-- Created: 2026-02-05
-- Description: Add score visibility controls to exams
--   - Always show (default for existing exams)
--   - Never show (teacher grading mode)
--   - Threshold-based (show only if score >= threshold)
-- =============================================

-- Add score visibility mode column
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS score_visibility_mode TEXT NOT NULL DEFAULT 'always' 
  CHECK (score_visibility_mode IN ('always', 'never', 'threshold'));

-- Add threshold column for conditional visibility
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS score_visibility_threshold NUMERIC(5,2);

-- Add comments for documentation
COMMENT ON COLUMN public.exams.score_visibility_mode IS 
  'Controls when students can view their scores: always (default), never, or threshold';

COMMENT ON COLUMN public.exams.score_visibility_threshold IS 
  'Minimum score required to view results (only used when mode=threshold). Example: 5.0 means students need >= 5.0 to see their score';

-- Set default threshold for existing exams with 'threshold' mode (if any)
UPDATE public.exams 
SET score_visibility_threshold = 5.0 
WHERE score_visibility_mode = 'threshold' 
  AND score_visibility_threshold IS NULL;

-- Verification query (run separately to check)
-- SELECT id, title, score_visibility_mode, score_visibility_threshold 
-- FROM public.exams 
-- LIMIT 5;
