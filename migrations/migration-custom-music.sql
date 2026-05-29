-- =============================================
-- CUSTOM MUSIC FOR CO-STUDY ROOMS
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.custom_music (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    label text NOT NULL,
    url text NOT NULL,
    type text NOT NULL, -- 'soundcloud' or 'url'
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_music ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own custom music" ON public.custom_music;
DROP POLICY IF EXISTS "Users can insert own custom music" ON public.custom_music;
DROP POLICY IF EXISTS "Users can delete own custom music" ON public.custom_music;

-- Create Policies
CREATE POLICY "Users can view own custom music" ON public.custom_music
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom music" ON public.custom_music
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom music" ON public.custom_music
    FOR DELETE USING (auth.uid() = user_id);

-- Create Index for performance
CREATE INDEX IF NOT EXISTS idx_custom_music_user ON public.custom_music(user_id);
