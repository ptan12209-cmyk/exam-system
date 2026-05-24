-- Migration: Personalized Learning Platform (Dynamic Study Planner & Pomodoro Co-study YPT Arena)
-- Date: 2026-05-24

-- 1. Create co_study_rooms table
CREATE TABLE IF NOT EXISTS co_study_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    is_private BOOLEAN DEFAULT false,
    passcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for co_study_rooms
ALTER TABLE co_study_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_study_rooms
DROP POLICY IF EXISTS "Anyone can view public co-study rooms" ON co_study_rooms;
CREATE POLICY "Anyone can view public co-study rooms" ON co_study_rooms
    FOR SELECT USING (NOT is_private OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON co_study_rooms;
CREATE POLICY "Authenticated users can create rooms" ON co_study_rooms
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own rooms" ON co_study_rooms;
CREATE POLICY "Creators can update own rooms" ON co_study_rooms
    FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own rooms" ON co_study_rooms;
CREATE POLICY "Creators can delete own rooms" ON co_study_rooms
    FOR DELETE USING (auth.uid() = creator_id);


-- 2. Create co_study_room_members table
CREATE TABLE IF NOT EXISTS co_study_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES co_study_rooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, student_id)
);

-- Enable RLS for co_study_room_members
ALTER TABLE co_study_room_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_study_room_members
DROP POLICY IF EXISTS "Room members can view room member list" ON co_study_room_members;
CREATE POLICY "Room members can view room member list" ON co_study_room_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can join rooms" ON co_study_room_members;
CREATE POLICY "Authenticated users can join rooms" ON co_study_room_members
    FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can leave rooms" ON co_study_room_members;
CREATE POLICY "Users can leave rooms" ON co_study_room_members
    FOR DELETE USING (auth.uid() = student_id);


-- 3. Create study_sessions table (YPT status tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    room_id UUID REFERENCES co_study_rooms(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('focusing', 'resting', 'offline')),
    last_status_change TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    total_focus_seconds_today INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id)
);

-- Enable RLS for study_sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions
DROP POLICY IF EXISTS "Anyone can view study sessions" ON study_sessions;
CREATE POLICY "Anyone can view study sessions" ON study_sessions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students manage own study sessions" ON study_sessions;
CREATE POLICY "Students manage own study sessions" ON study_sessions
    FOR ALL USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);


-- 4. Create study_notes table (Notion-like document blocks)
CREATE TABLE IF NOT EXISTS study_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB DEFAULT '[]'::jsonb, -- Notion-like block list
    subject TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for study_notes
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_notes
DROP POLICY IF EXISTS "Students manage own study notes" ON study_notes;
CREATE POLICY "Students manage own study notes" ON study_notes
    FOR ALL USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);


-- 5. Enable Realtime on study_sessions and co_study_room_members for live YPT dashboard
BEGIN;
    -- Drop tables from publication first to avoid duplicates
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS study_sessions;
    ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS co_study_room_members;
    
    -- Add tables to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE co_study_room_members;
COMMIT;
