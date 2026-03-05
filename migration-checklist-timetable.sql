-- Migration: Study Tasks + Timetable tables
-- Run this in Supabase SQL Editor

-- 1. Study Tasks (student personal checklist)
CREATE TABLE IF NOT EXISTS study_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own tasks" ON study_tasks
    FOR ALL USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_study_tasks_student ON study_tasks(student_id, is_completed);

-- 2. Timetable Entries (teacher weekly schedule)
CREATE TABLE IF NOT EXISTS timetable_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject TEXT NOT NULL,
    class_name TEXT,
    room TEXT,
    note TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own timetable" ON timetable_entries
    FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view timetables" ON timetable_entries
    FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacher_id, day_of_week);
