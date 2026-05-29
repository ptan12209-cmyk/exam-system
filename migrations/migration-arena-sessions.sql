-- =====================================================
-- MIGRATION: Fix arena_sessions table schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop the subject check constraint
ALTER TABLE arena_sessions DROP CONSTRAINT IF EXISTS arena_sessions_subject_check;

-- 2. Make subject nullable
ALTER TABLE arena_sessions ALTER COLUMN subject DROP NOT NULL;

-- 3. Set default value
ALTER TABLE arena_sessions ALTER COLUMN subject SET DEFAULT 'other';

-- 4. Add missing columns if needed
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id);
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- DONE! Now you can create arena sessions
-- =====================================================
