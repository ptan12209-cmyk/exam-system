-- ============================================================================
-- MIGRATION: DISCORD LIVE VOICE STUDY TRACKER INTEGRATION
-- Run this in Supabase SQL Editor to support Discord presence monitoring
-- ============================================================================

-- 1. Add discord_id to profiles for linking web profiles with Discord IDs
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE;

-- 2. Drop the existing status constraint on study_sessions
ALTER TABLE public.study_sessions DROP CONSTRAINT IF EXISTS study_sessions_status_check;

-- 3. Re-add status constraint supporting Discord class statuses
ALTER TABLE public.study_sessions ADD CONSTRAINT study_sessions_status_check 
    CHECK (status IN ('focusing', 'resting', 'offline', 'discord_class', 'discord_afk'));

-- 4. Add Discord presence and duration fields to study_sessions
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_duration INTEGER DEFAULT 0; -- total discord call seconds today
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_deafened BOOLEAN DEFAULT false; -- true if student deafened (AFK)
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS discord_last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
