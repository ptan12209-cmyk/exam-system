-- =============================================
-- UPGRADE LIVE_CONFIG FOR INTERACTIVE CO-STUDY (JITSI MEET)
-- Run this in Supabase SQL Editor
-- =============================================

-- Add live_mode and jitsi_room_name to live_config
ALTER TABLE public.live_config 
ADD COLUMN IF NOT EXISTS live_mode text DEFAULT 'youtube' CHECK (live_mode IN ('youtube', 'jitsi')),
ADD COLUMN IF NOT EXISTS jitsi_room_name text DEFAULT 'LuyenDe2026_LiveClass_Global';
