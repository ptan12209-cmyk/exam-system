-- Migration: Add status column to study_tasks table to support Kanban board view
-- Run this in your Supabase SQL Editor on the dashboard

-- 1. Add status column to study_tasks if it doesn't exist
ALTER TABLE public.study_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done'));

-- 2. Backfill status column based on existing is_completed column for any existing tasks
UPDATE public.study_tasks
SET status = CASE 
    WHEN is_completed = true THEN 'done'
    ELSE 'todo'
END
WHERE status IS NULL;
