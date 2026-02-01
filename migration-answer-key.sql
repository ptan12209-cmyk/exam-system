-- =====================================================
-- MIGRATION: Fix exams table schema completely
-- Run this ENTIRE file in Supabase SQL Editor
-- =====================================================

-- 1. Core columns
ALTER TABLE exams ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'other';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;

-- 2. PDF and Answer Key
ALTER TABLE exams ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS answer_key TEXT;

-- 3. Questions as JSONB (for exam-bank)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions JSONB;

-- 4. Creator reference
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 5. Make teacher_id nullable (remove NOT NULL constraint)
ALTER TABLE exams ALTER COLUMN teacher_id DROP NOT NULL;

-- 6. Sync created_by with teacher_id if needed
UPDATE exams SET created_by = teacher_id WHERE created_by IS NULL AND teacher_id IS NOT NULL;
UPDATE exams SET teacher_id = created_by WHERE teacher_id IS NULL AND created_by IS NOT NULL;

-- 7. Scheduling columns
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- 8. Timestamps
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- DONE! Now you can create exams with either teacher_id or created_by
-- =====================================================
