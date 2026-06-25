-- ============================================================================
-- MIGRATION: Discord Real Interaction Monitoring
-- Adds screen share and camera tracking columns
-- ============================================================================

-- 1. Add fields to public.study_sessions
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_sharing_screen BOOLEAN DEFAULT false;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_camera_on BOOLEAN DEFAULT false;

-- 2. Add fields to public.discord_attendance_logs
ALTER TABLE public.discord_attendance_logs ADD COLUMN IF NOT EXISTS total_sharing_screen_seconds INTEGER DEFAULT 0;
ALTER TABLE public.discord_attendance_logs ADD COLUMN IF NOT EXISTS total_camera_seconds INTEGER DEFAULT 0;
