-- MIGRATION: DEDICATED STUDENT DISCORD VOICE CHANNEL
-- 1. Upgrade public.profiles to add discord_study_channel_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_study_channel_id text;
