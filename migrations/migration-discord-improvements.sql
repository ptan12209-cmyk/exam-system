-- ============================================================================
-- MIGRATION: Discord Monitoring Improvements
-- Adds streak tracking, mute detection columns
-- ============================================================================

-- 1. Streak tracking columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_streak INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_discord_study_date DATE;

-- 2. Mute tracking column on discord_attendance_logs
ALTER TABLE public.discord_attendance_logs ADD COLUMN IF NOT EXISTS total_muted_seconds INTEGER DEFAULT 0;
