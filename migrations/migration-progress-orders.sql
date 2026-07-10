-- ============================================================================
-- Migration: Create tables for Lesson Progress Tracking and Order/Revenue Logging
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create student_lesson_progress table
CREATE TABLE IF NOT EXISTS public.student_lesson_progress (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    lesson_id uuid REFERENCES public.online_lessons(id) ON DELETE CASCADE NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    watched_seconds integer DEFAULT 0 NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(student_id, lesson_id)
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_student ON public.student_lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson ON public.student_lesson_progress(lesson_id);

-- Enable RLS
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Users can view their own lesson progress" 
ON public.student_lesson_progress FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert/update their own lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Users can insert/update their own lesson progress" 
ON public.student_lesson_progress FOR ALL TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers and admins can view all lesson progress" ON public.student_lesson_progress;
CREATE POLICY "Teachers and admins can view all lesson progress" 
ON public.student_lesson_progress FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  )
);

-- 2. Create online_orders table
CREATE TABLE IF NOT EXISTS public.online_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject_key text NOT NULL,
    amount numeric NOT NULL,
    memo text NOT NULL,
    status text DEFAULT 'pending' NOT NULL, -- 'pending' | 'success' | 'failed'
    created_at timestamptz DEFAULT now()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_online_orders_student ON public.online_orders(student_id);

-- Enable RLS
ALTER TABLE public.online_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.online_orders;
CREATE POLICY "Users can view their own orders" 
ON public.online_orders FOR SELECT TO authenticated USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers and admins can manage all orders" ON public.online_orders;
CREATE POLICY "Teachers and admins can manage all orders" 
ON public.online_orders FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  )
);
