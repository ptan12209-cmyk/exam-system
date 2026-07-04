-- ============================================================================
-- Migration: Add granular online subjects permission per student
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_online_subjects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject text NOT NULL, -- e.g., 'math', 'physics', 'all'
    assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(student_id, subject)
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_student_online_subjects_student ON public.student_online_subjects(student_id);

-- Enable RLS
ALTER TABLE public.student_online_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own assigned online subjects" 
ON public.student_online_subjects 
FOR SELECT 
TO authenticated 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers and admins can do all on student online subjects" 
ON public.student_online_subjects 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  )
);
