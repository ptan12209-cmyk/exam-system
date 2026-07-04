-- ============================================================================
-- MIGRATION: ONLINE STUDY & ONLINE STUDENT ROLE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Upgrade public.profiles to add 'online_student' role
-- ============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'online_student'));

-- 2. Create public.online_folders (flexible nested directory structures)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.online_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    parent_id uuid REFERENCES public.online_folders(id) ON DELETE CASCADE,
    subject text NOT NULL,
    order_index integer DEFAULT 1,
    teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_online_folders_subject ON public.online_folders(subject);
CREATE INDEX IF NOT EXISTS idx_online_folders_parent ON public.online_folders(parent_id);

-- 3. Create public.online_lessons (video + document attached within folder)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.online_lessons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid REFERENCES public.online_folders(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    video_url text, -- Link video lecture (YouTube embed, Drive, etc)
    document_url text, -- Link document (PDF, Slide, docs, etc)
    order_index integer DEFAULT 1,
    teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_online_lessons_folder ON public.online_lessons(folder_id);

-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.online_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_lessons ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for public.online_folders
-- ============================================================================
DROP POLICY IF EXISTS "Allow users to view online_folders" ON public.online_folders;
CREATE POLICY "Allow users to view online_folders" ON public.online_folders
    FOR SELECT TO authenticated
    USING (true); -- Everyone who is logged in (including online students) can view folders

DROP POLICY IF EXISTS "Allow teachers to manage online_folders" ON public.online_folders;
CREATE POLICY "Allow teachers to manage online_folders" ON public.online_folders
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );

-- 6. RLS Policies for public.online_lessons
-- ============================================================================
DROP POLICY IF EXISTS "Allow users to view online_lessons" ON public.online_lessons;
CREATE POLICY "Allow users to view online_lessons" ON public.online_lessons
    FOR SELECT TO authenticated
    USING (true); -- Everyone who is logged in can view lessons

DROP POLICY IF EXISTS "Allow teachers to manage online_lessons" ON public.online_lessons;
CREATE POLICY "Allow teachers to manage online_lessons" ON public.online_lessons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
        )
    );
