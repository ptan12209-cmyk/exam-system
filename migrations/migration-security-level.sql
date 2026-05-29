-- Migration: Add security_level column to exams table
-- Run this in Supabase SQL Editor

-- security_level: 0 = no anti-cheat, 1 = basic (tab/fullscreen), 2 = + webcam, 3 = + audio, 4 = + face AI
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS security_level integer DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.exams.security_level IS 'Anti-cheat level: 0=off, 1=basic(tab+fullscreen), 2=+webcam, 3=+audio, 4=+face_detection';
