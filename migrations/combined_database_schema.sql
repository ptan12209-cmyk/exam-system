-- ========================================================
-- UNIFIED DATABASE SCHEMA & MIGRATIONS FOR EXAMHUB
-- Generated automatically by combining all active SQL scripts
-- ========================================================

-- ========================================================
-- SECTION 1: BASE SYSTEM SCHEMA (supabase-schema.sql)
-- ========================================================
-- =============================================
-- EXAM SYSTEM DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
DROP TABLE IF EXISTS public.profiles CASCADE;
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('student', 'teacher')),
  full_name text,
  class text,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- =============================================
-- 2. EXAMS TABLE
-- =============================================
DROP TABLE IF EXISTS public.exams CASCADE;
create table public.exams (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  pdf_url text,
  duration integer not null default 15, -- minutes
  total_questions integer not null default 10,
  correct_answers text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  config jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.exams enable row level security;

-- Policies
DROP POLICY IF EXISTS "Teachers can create exams" ON exams;
create policy "Teachers can create exams"
  on exams for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Teachers can update own exams" ON exams;
create policy "Teachers can update own exams"
  on exams for update
  using (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can delete own exams" ON exams;
create policy "Teachers can delete own exams"
  on exams for delete
  using (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON exams;
create policy "Published exams are viewable by all authenticated users"
  on exams for select
  using (
    status = 'published' or teacher_id = auth.uid()
  );

-- =============================================
-- 3. SUBMISSIONS TABLE
-- =============================================
DROP TABLE IF EXISTS public.submissions CASCADE;
create table public.submissions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid references public.exams(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  student_answers text[] not null default '{}',
  score numeric(5,2) not null default 0,
  correct_count integer not null default 0,
  time_spent integer not null default 0, -- seconds
  started_at timestamptz default now(),
  submitted_at timestamptz default now() not null,
  
  -- Unique constraint: one submission per student per exam
  unique(exam_id, student_id)
);

-- Enable RLS
alter table public.submissions enable row level security;

-- Policies
DROP POLICY IF EXISTS "Students can submit" ON submissions;
create policy "Students can submit"
  on submissions for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'student'
    )
  );

DROP POLICY IF EXISTS "Users can view own submissions" ON submissions;
create policy "Users can view own submissions"
  on submissions for select
  using (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view submissions for their exams" ON submissions;
create policy "Teachers can view submissions for their exams"
  on submissions for select
  using (
    exists (
      select 1 from exams
      where exams.id = submissions.exam_id
      and exams.teacher_id = auth.uid()
    )
  );

-- Leaderboard: all authenticated users can view submissions for published exams
DROP POLICY IF EXISTS "View leaderboard for published exams" ON submissions;
create policy "View leaderboard for published exams"
  on submissions for select
  using (
    exists (
      select 1 from exams
      where exams.id = submissions.exam_id
      and exams.status = 'published'
    )
  );

-- =============================================
-- 4. STORAGE BUCKET FOR PDFs
-- =============================================
-- Run this in Supabase Dashboard > Storage > Create bucket:
-- Name: exam-pdfs
-- Public: true

-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('exam-pdfs', 'exam-pdfs', true)
on conflict (id) do nothing;

-- Storage policies
DROP POLICY IF EXISTS "Teachers can upload PDFs" ON storage.objects;
create policy "Teachers can upload PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'exam-pdfs' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Anyone can view exam PDFs" ON storage.objects;
create policy "Anyone can view exam PDFs"
  on storage.objects for select
  using (bucket_id = 'exam-pdfs');

DROP POLICY IF EXISTS "Teachers can delete own PDFs" ON storage.objects;
create policy "Teachers can delete own PDFs"
  on storage.objects for delete
  using (
    bucket_id = 'exam-pdfs' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================
-- 5. TRIGGERS & FUNCTIONS
-- =============================================

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS exams_updated_at ON exams;
create trigger exams_updated_at
  before update on exams
  for each row
  execute function update_updated_at();

-- Create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();


-- ========================================================
-- SECTION 2: CORE FEATURE TABLES & SCHEMA EXTENSIONS
-- ========================================================
-- >>> Migration: migration-phase6-question-bank.sql <<<
-- ============================================================================
-- Phase 6 Priority 2: Question Bank & Arena System
-- ============================================================================
-- ============================================================================
-- 2. ARENA SESSIONS TABLE - Các đợt thi đấu trường
-- ============================================================================

DROP TABLE IF EXISTS arena_sessions CASCADE;
CREATE TABLE arena_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic info
    name text NOT NULL,                 -- "Đợt 1 - Vật Lý Tháng 1"
    description text,
    subject text NOT NULL CHECK (subject IN ('physics', 'chemistry')),
    
    -- Time window
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    duration integer DEFAULT 60,        -- Thời gian làm bài (phút)
    
    -- Configuration
    questions_per_level integer DEFAULT 10,  -- Số câu mỗi mức độ
    total_questions integer DEFAULT 40,      -- Tổng số câu (10×4)
    
    -- Status
    status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
    
    -- Creator
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arena_sessions_subject ON arena_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_status ON arena_sessions(status);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_time ON arena_sessions(start_time, end_time);

-- Enable RLS
ALTER TABLE arena_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view arena sessions" ON arena_sessions;
CREATE POLICY "Anyone can view arena sessions"
    ON arena_sessions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Teachers can create arena sessions" ON arena_sessions;
CREATE POLICY "Teachers can create arena sessions"
    ON arena_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update arena sessions" ON arena_sessions;
CREATE POLICY "Creators can update arena sessions"
    ON arena_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

-- ============================================================================
-- 3. ARENA RESULTS TABLE - Kết quả đấu trường
-- ============================================================================

DROP TABLE IF EXISTS arena_results CASCADE;
CREATE TABLE arena_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    arena_id uuid REFERENCES arena_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Score
    score numeric(5,2) NOT NULL,
    correct_count integer NOT NULL,
    total_questions integer NOT NULL,
    time_spent integer NOT NULL,        -- Thời gian làm (giây)
    
    -- Detailed answers
    answers jsonb NOT NULL,             -- [{question_id, answer, is_correct}, ...]
    question_ids uuid[] NOT NULL,       -- Danh sách câu hỏi đã làm
    
    -- Ranking
    rank integer,                       -- Thứ hạng (cập nhật sau khi đợt kết thúc)
    
    submitted_at timestamptz DEFAULT now(),
    
    -- Unique: mỗi học sinh chỉ làm 1 lần mỗi đợt
    UNIQUE(arena_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arena_results_arena ON arena_results(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_results_student ON arena_results(student_id);
CREATE INDEX IF NOT EXISTS idx_arena_results_score ON arena_results(arena_id, score DESC);

-- Enable RLS
ALTER TABLE arena_results ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Students can view own results" ON arena_results;
CREATE POLICY "Students can view own results"
    ON arena_results FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view leaderboard" ON arena_results;
CREATE POLICY "Anyone can view leaderboard"
    ON arena_results FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Students can submit results" ON arena_results;
CREATE POLICY "Students can submit results"
    ON arena_results FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get random questions for arena by difficulty
CREATE OR REPLACE FUNCTION get_arena_questions(
    p_bank_id uuid,
    p_count_per_level integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content text,
    options jsonb,
    correct_answer jsonb,
    difficulty integer
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked AS (
        SELECT 
            q.id,
            q.content,
            q.options,
            q.correct_answer,
            q.difficulty,
            ROW_NUMBER() OVER (PARTITION BY q.difficulty ORDER BY random()) as rn
        FROM questions q
        WHERE q.bank_id = p_bank_id
    )
    SELECT 
        ranked.id,
        ranked.content,
        ranked.options,
        ranked.correct_answer,
        ranked.difficulty
    FROM ranked
    WHERE ranked.rn <= p_count_per_level
    ORDER BY ranked.difficulty, random();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update arena status based on time
CREATE OR REPLACE FUNCTION update_arena_status()
RETURNS void AS $$
BEGIN
    -- Mark as active
    UPDATE arena_sessions
    SET status = 'active'
    WHERE status = 'upcoming'
    AND start_time <= NOW()
    AND end_time > NOW();
    
    -- Mark as ended
    UPDATE arena_sessions
    SET status = 'ended'
    WHERE status = 'active'
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate rankings for ended arena
CREATE OR REPLACE FUNCTION calculate_arena_rankings(p_arena_id uuid)
RETURNS void AS $$
BEGIN
    WITH ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, time_spent ASC) as new_rank
        FROM arena_results
        WHERE arena_id = p_arena_id
    )
    UPDATE arena_results ar
    SET rank = r.new_rank
    FROM ranked r
    WHERE ar.id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. SUBJECT LABELS (for reference)
-- ============================================================================
-- math = Toán
-- physics = Vật Lý  
-- chemistry = Hóa Học

-- DIFFICULTY LABELS:
-- 1 = Dễ (Nhận biết)
-- 2 = Trung bình (Thông hiểu)
-- 3 = Khó (Vận dụng)
-- 4 = Rất khó (Vận dụng cao)


-- >>> Migration: migration-sprint3.2-question-bank.sql <<<
-- ============================================================================
-- SPRINT 3.2: QUESTION BANK & DIGITAL EXAMS MIGRATION
-- ============================================================================

-- 1. Thêm loại đề thi vào bảng exams
-- ============================================================================
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type text DEFAULT 'pdf' CHECK (exam_type IN ('pdf', 'digital'));

-- 2. QUESTION BANKS TABLE - Nhóm câu hỏi / Thư mục
-- ============================================================================
DROP TABLE IF EXISTS question_banks CASCADE;
CREATE TABLE question_banks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    subject text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_banks_teacher ON question_banks(teacher_id);
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;

-- Safely drop old policies if they exist so we can recreate them
DROP POLICY IF EXISTS "Teachers can view own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can insert own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can update own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can delete own banks" ON question_banks;

DROP POLICY IF EXISTS "Teachers can view own banks" ON question_banks;
CREATE POLICY "Teachers can view own banks"
    ON question_banks FOR SELECT TO authenticated
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can insert own banks" ON question_banks;
CREATE POLICY "Teachers can insert own banks"
    ON question_banks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update own banks" ON question_banks;
CREATE POLICY "Teachers can update own banks"
    ON question_banks FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete own banks" ON question_banks;
CREATE POLICY "Teachers can delete own banks"
    ON question_banks FOR DELETE TO authenticated
    USING (auth.uid() = teacher_id);

-- 3. QUESTIONS TABLE - Ngân hàng câu hỏi chi tiết
-- ============================================================================
-- Xoá bảng cũ (nếu có từ Phase 6) để tạo lại với cấu trúc đúng chuẩn hỗ trợ TF, SA
DROP TABLE IF EXISTS questions CASCADE;
CREATE TABLE questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id uuid REFERENCES question_banks(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    question_type text NOT NULL CHECK (question_type IN ('mc', 'tf', 'sa')),
    difficulty integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 4),
    
    -- Nội dung
    content text NOT NULL,          -- HTML/LaTeX đề bài
    options jsonb,                  -- Cho MC: ["A...", "B...", "C...", "D..."]
    correct_answer jsonb NOT NULL,  -- MC: "A", SA: "2024", TF: {"a":true,"b":false,"c":true,"d":false}
    explanation text,               -- Giải thích
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher ON questions(teacher_id);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own questions" ON questions;
CREATE POLICY "Teachers can view own questions"
    ON questions FOR SELECT TO authenticated
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can insert own questions" ON questions;
CREATE POLICY "Teachers can insert own questions"
    ON questions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update own questions" ON questions;
CREATE POLICY "Teachers can update own questions"
    ON questions FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete own questions" ON questions;
CREATE POLICY "Teachers can delete own questions"
    ON questions FOR DELETE TO authenticated
    USING (auth.uid() = teacher_id);

-- 4. EXAM_QUESTIONS - Bảng trung gian map câu hỏi vào đề thi Digital
-- ============================================================================
DROP TABLE IF EXISTS exam_questions CASCADE;
CREATE TABLE exam_questions (
    exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    order_index integer NOT NULL,
    PRIMARY KEY (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view exam questions" ON exam_questions;
DROP POLICY IF EXISTS "Teachers can manage exam questions" ON exam_questions;

-- Cho phép học sinh xem câu hỏi nếu họ được phép xem đề thi
DROP POLICY IF EXISTS "Students can view exam questions" ON exam_questions;
CREATE POLICY "Students can view exam questions"
    ON exam_questions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_questions.exam_id 
            AND e.status = 'published'
        )
    );

DROP POLICY IF EXISTS "Teachers can manage exam questions" ON exam_questions;
CREATE POLICY "Teachers can manage exam questions"
    ON exam_questions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_questions.exam_id 
            AND e.teacher_id = auth.uid()
        )
    );

-- Vì bảng questions đang bị chặn RLS (chỉ teacher xem được), 
-- Ta cần mở RLS bảng questions cho học sinh khi đang thi:
DROP POLICY IF EXISTS "Students can view questions linked to published exams" ON questions;

CREATE POLICY "Students can view questions linked to published exams"
    ON questions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exam_questions eq
            JOIN exams e ON e.id = eq.exam_id
            WHERE eq.question_id = questions.id
            AND e.status = 'published'
        )
    );


-- >>> Migration: 20260510_spaced_repetition.sql <<<
-- Spaced Repetition System
DROP TABLE IF EXISTS spaced_repetition_cards CASCADE;
CREATE TABLE spaced_repetition_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INT DEFAULT 0,
  repetitions INT DEFAULT 0,
  next_review_date TIMESTAMPTZ DEFAULT NOW(),
  last_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);
CREATE INDEX idx_sr_cards_user_next ON spaced_repetition_cards(user_id, next_review_date);


-- ============================================================================
-- NOTIFICATIONS TABLE (used by parent dashboard trigger)
-- ============================================================================
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'general',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- >>> Migration: 20260512010000_parent_dashboard.sql <<<
-- ============================================================================
-- Parent Dashboard Migration
-- Description: Creates parent_student_links table, adds 'parent' role support,
--              RLS policies for parent-child linking, and a trigger that notifies
--              parents when their linked student completes an exam.
-- ============================================================================

-- 1. Create parent_student_links table
-- ============================================================================
DROP TABLE IF EXISTS public.parent_student_links CASCADE;
CREATE TABLE public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(parent_id, student_id)
);

-- Indexes for fast parent→children and child→parents lookups
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent
    ON public.parent_student_links(parent_id);

CREATE INDEX IF NOT EXISTS idx_parent_student_links_student
    ON public.parent_student_links(student_id);

-- 2. Add 'parent' as a valid role in profiles
-- ============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'teacher', 'admin', 'parent'));

-- 3. Enable RLS and add policies for parent_student_links
-- ============================================================================
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- Parents can view their own parent-child links
DROP POLICY IF EXISTS "Parents can view own links" ON public.parent_student_links;
CREATE POLICY "Parents can view own links"
    ON public.parent_student_links
    FOR SELECT
    TO authenticated
    USING (parent_id = auth.uid());

-- Parents can link their children (insert)
DROP POLICY IF EXISTS "Parents can insert own links" ON public.parent_student_links;
CREATE POLICY "Parents can insert own links"
    ON public.parent_student_links
    FOR INSERT
    TO authenticated
    WITH CHECK (parent_id = auth.uid());

-- Parents can unlink their children (delete)
DROP POLICY IF EXISTS "Parents can delete own links" ON public.parent_student_links;
CREATE POLICY "Parents can delete own links"
    ON public.parent_student_links
    FOR DELETE
    TO authenticated
    USING (parent_id = auth.uid());

-- 4. Trigger function: notify parent(s) when a linked student completes an exam
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_parent_on_exam_completion()
RETURNS TRIGGER AS $$
DECLARE
    parent_record RECORD;
    v_student_name TEXT;
    v_exam_title  TEXT;
BEGIN
    -- Look up the student's display name
    SELECT full_name INTO v_student_name
    FROM public.profiles
    WHERE id = NEW.student_id;

    -- Look up the exam title
    SELECT title INTO v_exam_title
    FROM public.exams
    WHERE id = NEW.exam_id;

    -- Insert one notification for every parent linked to this student
    FOR parent_record IN
        SELECT parent_id
        FROM public.parent_student_links
        WHERE student_id = NEW.student_id
    LOOP
        INSERT INTO public.notifications
            (user_id, title, message, type, link, is_read, created_at)
        VALUES (
            parent_record.parent_id,
            'Bài thi hoàn thành',
            'Con bạn ' || COALESCE(v_student_name, 'Học sinh') ||
            ' vừa hoàn thành bài thi: ' || COALESCE(v_exam_title, 'bài thi'),
            'exam_completed',
            '/exams/' || NEW.exam_id,
            false,
            now()
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to the submissions table
DROP TRIGGER IF EXISTS tr_notify_parent_on_exam_completion ON public.submissions;
CREATE TRIGGER tr_notify_parent_on_exam_completion
    AFTER INSERT ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_parent_on_exam_completion();


-- >>> Migration: add-profile-fields.sql <<<
-- Migration: Add profile customization fields
-- Add columns for avatar, nickname, bio, and phone to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname) WHERE nickname IS NOT NULL;

-- Add check constraint for bio length
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_bio_length;
ALTER TABLE profiles 
ADD CONSTRAINT check_bio_length CHECK (char_length(bio) <= 200);

-- Add check constraint for nickname length and format
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_nickname_format;
ALTER TABLE profiles 
ADD CONSTRAINT check_nickname_format CHECK (
    nickname IS NULL OR (
        char_length(nickname) >= 3 AND 
        char_length(nickname) <= 20 AND
        nickname ~ '^[a-zA-Z0-9_]+$'
    )
);


-- >>> Migration: migration-answer-key.sql <<<
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


-- >>> Migration: migration-anticheat.sql <<<
-- Migration: Add anti-cheat tracking columns
-- Run this in Supabase SQL Editor

ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS tab_switches integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS fullscreen_exits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS copy_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS violations jsonb DEFAULT '[]';

-- violations: Array of {type: 'tab_switch'|'fullscreen_exit'|'copy_attempt', timestamp: '...'}

COMMENT ON COLUMN public.submissions.tab_switches IS 'Number of times student switched tabs during exam';
COMMENT ON COLUMN public.submissions.fullscreen_exits IS 'Number of times student exited fullscreen during exam';
COMMENT ON COLUMN public.submissions.violations IS 'Detailed log of all violations with timestamps';


-- >>> Migration: migration-arena-exam-link.sql <<<
-- ============================================================================
-- Migration: Arena uses Exams instead of individual Questions
-- ============================================================================

-- 1. Add exam_id to arena_sessions (link arena to specific exam)
ALTER TABLE arena_sessions 
ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES exams(id) ON DELETE SET NULL;

-- 2. Remove subject column (will use exam's subject instead)
-- Keep for now as fallback, can remove later
-- ALTER TABLE arena_sessions DROP COLUMN IF EXISTS subject;

-- 3. Remove total_questions (will use exam's question count)
-- Keep for now as fallback

-- 4. Drop questions table (no longer needed)
-- UNCOMMENT BELOW TO DROP - BE CAREFUL!
-- DROP TABLE IF EXISTS questions CASCADE;

-- 5. Update arena_results to store exam_id for easier querying
-- (arena_id already references arena_sessions which now has exam_id)

COMMENT ON COLUMN arena_sessions.exam_id IS 'Reference to the exam used in this arena session';


-- >>> Migration: migration-arena-sessions.sql <<<
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
-- Note: created_by already exists from CREATE TABLE (references auth.users)
-- ALTER TABLE arena_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
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


-- >>> Migration: migration-checklist-timetable.sql <<<
-- Migration: Study Tasks + Timetable tables
-- Run this in Supabase SQL Editor

-- 1. Study Tasks (student personal checklist)
DROP TABLE IF EXISTS study_tasks CASCADE;
CREATE TABLE study_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own tasks" ON study_tasks;
CREATE POLICY "Students manage own tasks" ON study_tasks
    FOR ALL USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS idx_study_tasks_student ON study_tasks(student_id, is_completed);

-- 2. Timetable Entries (teacher weekly schedule)
DROP TABLE IF EXISTS timetable_entries CASCADE;
CREATE TABLE timetable_entries (
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

DROP POLICY IF EXISTS "Teachers manage own timetable" ON timetable_entries;
CREATE POLICY "Teachers manage own timetable" ON timetable_entries
    FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Anyone can view timetables" ON timetable_entries;
CREATE POLICY "Anyone can view timetables" ON timetable_entries
    FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable_entries(teacher_id, day_of_week);


-- REMOVED: migration-diagnose-triggers.sql (diagnostic queries, not migration DDL)

-- >>> Migration: migration-exam-subjects.sql <<<
-- =============================================
-- EXAM SUBJECTS - Phân loại đề thi theo môn học
-- Run this in Supabase SQL Editor
-- =============================================

-- Add subject column to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'other';

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_exams_subject ON public.exams(subject);

-- Update RLS policies to allow reading subject field (already covered by existing policies)
-- No additional RLS changes needed since subject is just a column on exams table

-- =============================================
-- DONE! Run this in Supabase SQL Editor
-- =============================================


-- >>> Migration: migration-fix-rpc-functions.sql <<<
-- =============================================
-- FIX C-2: Consolidated RPC functions with auth.uid() enforcement
-- Run this in Supabase SQL Editor
-- Fixes: missing redeem_reward, daily_checkin, check_and_unlock_achievements
-- Security: each function verifies p_user_id matches auth.uid()
-- =============================================

-- =============================================
-- 1. redeem_reward - Atomic XP deduction + reward redemption
-- Called by: POST /api/rewards (src/app/api/rewards/route.ts:68)
-- =============================================
CREATE OR REPLACE FUNCTION public.redeem_reward(
    p_user_id uuid,
    p_reward_id uuid
) RETURNS jsonb
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
    v_reward public.rewards%ROWTYPE;
    v_user_xp integer;
BEGIN
    -- Enforce caller matches target user
    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Get reward details
    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward not found or inactive');
    END IF;

    -- Check stock
    IF v_reward.stock = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward out of stock');
    END IF;

    -- Get user XP
    SELECT xp INTO v_user_xp FROM public.student_stats WHERE user_id = p_user_id;

    IF v_user_xp IS NULL OR v_user_xp < v_reward.xp_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient XP', 'required', v_reward.xp_cost, 'current', COALESCE(v_user_xp, 0));
    END IF;

    -- Deduct XP
    UPDATE public.student_stats
    SET xp = xp - v_reward.xp_cost
    WHERE user_id = p_user_id;

    -- Reduce stock if not unlimited
    IF v_reward.stock > 0 THEN
        UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
    END IF;

    -- Record redemption
    INSERT INTO public.student_rewards (user_id, reward_id, status)
    VALUES (p_user_id, p_reward_id, 'delivered');

    RETURN jsonb_build_object(
        'success', true,
        'reward_name', v_reward.name,
        'xp_spent', v_reward.xp_cost,
        'remaining_xp', v_user_xp - v_reward.xp_cost
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. daily_checkin - Daily login streak tracking + XP bonus
-- Called by: POST /api/daily-checkin (src/app/api/daily-checkin/route.ts:15)
-- =============================================
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id uuid)
RETURNS jsonb
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_yesterday date := CURRENT_DATE - 1;
    v_last_login record;
    v_current_streak integer := 1;
    v_xp_bonus integer := 10;
    v_result jsonb;
BEGIN
    -- Enforce caller matches target user
    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Check if already logged in today
    SELECT * INTO v_last_login FROM public.daily_logins
    WHERE user_id = p_user_id AND login_date = v_today;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_checked', true,
            'streak', v_last_login.streak_day,
            'xp_earned', 0
        );
    END IF;

    -- Get yesterday's login to calculate streak
    SELECT * INTO v_last_login FROM public.daily_logins
    WHERE user_id = p_user_id AND login_date = v_yesterday;

    IF FOUND THEN
        v_current_streak := v_last_login.streak_day + 1;
        v_xp_bonus := LEAST(10 + (v_current_streak * 2), 50);
    ELSE
        v_current_streak := 1;
        v_xp_bonus := 10;
    END IF;

    -- Insert today's login
    INSERT INTO public.daily_logins (user_id, login_date, xp_earned, streak_day)
    VALUES (p_user_id, v_today, v_xp_bonus, v_current_streak);

    -- Add XP to student_stats
    UPDATE public.student_stats
    SET xp = xp + v_xp_bonus,
        streak_days = v_current_streak,
        last_exam_date = v_today
    WHERE user_id = p_user_id;

    -- If no stats record, create one
    IF NOT FOUND THEN
        INSERT INTO public.student_stats (user_id, xp, streak_days, last_exam_date)
        VALUES (p_user_id, v_xp_bonus, v_current_streak, v_today);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_checked', false,
        'streak', v_current_streak,
        'xp_earned', v_xp_bonus,
        'milestone', CASE
            WHEN v_current_streak IN (7, 14, 30, 50, 100) THEN v_current_streak
            ELSE null
        END
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. check_and_unlock_achievements - Check all achievement conditions
-- Called by: POST /api/daily-checkin (src/app/api/daily-checkin/route.ts:25)
-- =============================================
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS jsonb
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
    v_stats record;
    v_achievement record;
    v_unlocked text[] := '{}';
    v_total_xp integer := 0;
BEGIN
    -- Enforce caller matches target user
    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('unlocked', '{}', 'xp_earned', 0);
    END IF;

    -- Get user stats
    SELECT * INTO v_stats FROM public.student_stats WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('unlocked', '{}', 'xp_earned', 0);
    END IF;

    -- Check each achievement the user hasn't unlocked yet
    FOR v_achievement IN
        SELECT a.* FROM public.achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_achievements ua
            WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
        )
    LOOP
        DECLARE
            v_should_unlock boolean := false;
        BEGIN
            CASE v_achievement.condition_type
                WHEN 'exams_completed' THEN
                    v_should_unlock := v_stats.exams_completed >= v_achievement.condition_value;
                WHEN 'streak_days' THEN
                    v_should_unlock := v_stats.streak_days >= v_achievement.condition_value;
                WHEN 'perfect_scores' THEN
                    v_should_unlock := v_stats.perfect_scores >= v_achievement.condition_value;
                WHEN 'total_xp' THEN
                    v_should_unlock := v_stats.xp >= v_achievement.condition_value;
                WHEN 'level' THEN
                    v_should_unlock := v_stats.level >= v_achievement.condition_value;
                ELSE
                    v_should_unlock := false;
            END CASE;

            IF v_should_unlock THEN
                -- Unlock achievement
                INSERT INTO public.user_achievements (user_id, achievement_id)
                VALUES (p_user_id, v_achievement.id)
                ON CONFLICT DO NOTHING;

                -- Add XP reward
                IF v_achievement.xp_reward > 0 THEN
                    UPDATE public.student_stats
                    SET xp = xp + v_achievement.xp_reward
                    WHERE user_id = p_user_id;

                    v_total_xp := v_total_xp + v_achievement.xp_reward;
                END IF;

                v_unlocked := array_append(v_unlocked, v_achievement.name);
            END IF;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'unlocked', v_unlocked,
        'xp_earned', v_total_xp
    );
END;
$$ LANGUAGE plpgsql;


-- >>> Migration: migration-gamification-v2.sql <<<
-- =============================================
-- ADVANCED GAMIFICATION: Daily Streak & Achievements
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. DAILY LOGIN TRACKING
-- =============================================
DROP TABLE IF EXISTS public.daily_logins CASCADE;
CREATE TABLE public.daily_logins (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    login_date date NOT NULL DEFAULT CURRENT_DATE,
    xp_earned integer DEFAULT 0,
    streak_day integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, login_date)
);

-- =============================================
-- 2. ACHIEVEMENTS (Thành tựu)
-- =============================================
DROP TABLE IF EXISTS public.achievements CASCADE;
CREATE TABLE public.achievements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    category text DEFAULT 'general', -- 'study', 'streak', 'score', 'special'
    rarity text DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    xp_reward integer DEFAULT 0,
    condition_type text NOT NULL, -- 'exams_completed', 'streak_days', 'perfect_scores', 'total_xp', 'questions_correct'
    condition_value integer NOT NULL,
    is_hidden boolean DEFAULT false, -- Hidden until unlocked
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. USER ACHIEVEMENTS
-- =============================================
DROP TABLE IF EXISTS public.user_achievements CASCADE;
CREATE TABLE public.user_achievements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    achievement_id uuid REFERENCES public.achievements NOT NULL,
    unlocked_at timestamptz DEFAULT now(),
    is_featured boolean DEFAULT false, -- Show on profile
    UNIQUE(user_id, achievement_id)
);

-- =============================================
-- 4. TITLES (Danh hiệu hiển thị)
-- =============================================
DROP TABLE IF EXISTS public.titles CASCADE;
CREATE TABLE public.titles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    display_text text NOT NULL, -- "🔥 Học sinh chăm chỉ"
    color text DEFAULT '#ffffff',
    unlock_achievement_id uuid REFERENCES public.achievements,
    unlock_xp integer, -- Alternative: unlock by XP
    sort_order integer DEFAULT 0,
    UNIQUE(name)
);

-- Add equipped_title to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS equipped_title_id uuid REFERENCES public.titles;

-- =============================================
-- 5. RLS POLICIES
-- =============================================
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-running migration)
DROP POLICY IF EXISTS "Users can view own logins" ON public.daily_logins;
DROP POLICY IF EXISTS "Users can insert own logins" ON public.daily_logins;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view others achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;

-- Daily logins
DROP POLICY IF EXISTS "Users can view own logins" ON public.daily_logins;
CREATE POLICY "Users can view own logins" ON public.daily_logins
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own logins" ON public.daily_logins;
CREATE POLICY "Users can insert own logins" ON public.daily_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements - public read
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT TO authenticated USING (true);

-- User achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view others achievements" ON public.user_achievements;
CREATE POLICY "Users can view others achievements" ON public.user_achievements
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;
CREATE POLICY "System can insert achievements" ON public.user_achievements
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Titles
DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;
CREATE POLICY "Anyone can view titles" ON public.titles
    FOR SELECT TO authenticated USING (true);

-- 6. DAILY CHECK-IN FUNCTION — REMOVED (using secure version from migration-fix-rpc-functions.sql)

-- 7. CHECK ACHIEVEMENTS FUNCTION — REMOVED (using secure version from migration-fix-rpc-functions.sql)


-- =============================================
-- 8. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_logins_user ON public.daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_date ON public.daily_logins(login_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);

-- =============================================
-- 9. SEED DATA - ACHIEVEMENTS (50+ achievements)
-- =============================================
INSERT INTO public.achievements (code, name, description, icon, category, rarity, xp_reward, condition_type, condition_value, is_hidden, sort_order) VALUES
    -- ===== STUDY ACHIEVEMENTS (Learning milestones) =====
    ('first_exam', 'Bước đầu tiên', 'Hoàn thành bài thi đầu tiên', '🎯', 'study', 'common', 50, 'exams_completed', 1, false, 1),
    ('5_exams', 'Khởi động', 'Hoàn thành 5 bài thi', '📝', 'study', 'common', 75, 'exams_completed', 5, false, 2),
    ('10_exams', 'Siêng năng', 'Hoàn thành 10 bài thi', '📚', 'study', 'common', 100, 'exams_completed', 10, false, 3),
    ('25_exams', 'Chăm học', 'Hoàn thành 25 bài thi', '📖', 'study', 'rare', 200, 'exams_completed', 25, false, 4),
    ('50_exams', 'Học sinh chăm chỉ', 'Hoàn thành 50 bài thi', '🎓', 'study', 'rare', 300, 'exams_completed', 50, false, 5),
    ('100_exams', 'Chiến binh tri thức', 'Hoàn thành 100 bài thi', '⚔️', 'study', 'epic', 500, 'exams_completed', 100, false, 6),
    ('250_exams', 'Học giả', 'Hoàn thành 250 bài thi', '📜', 'study', 'epic', 750, 'exams_completed', 250, false, 7),
    ('500_exams', 'Bậc thầy', 'Hoàn thành 500 bài thi', '🏛️', 'study', 'legendary', 1000, 'exams_completed', 500, false, 8),
    ('1000_exams', 'Huyền thoại sống', 'Hoàn thành 1000 bài thi', '👑', 'study', 'legendary', 2000, 'exams_completed', 1000, true, 9),
    
    -- ===== STREAK ACHIEVEMENTS (Consistency) =====
    ('streak_3', 'Bắt đầu streak', '3 ngày liên tiếp', '✨', 'streak', 'common', 30, 'streak_days', 3, false, 20),
    ('streak_7', 'Kiên trì 1 tuần', '7 ngày liên tiếp', '🔥', 'streak', 'common', 70, 'streak_days', 7, false, 21),
    ('streak_14', 'Siêu kiên trì', '14 ngày liên tiếp', '🔥', 'streak', 'rare', 150, 'streak_days', 14, false, 22),
    ('streak_21', 'Thói quen mới', '21 ngày liên tiếp - Tạo thói quen!', '💪', 'streak', 'rare', 210, 'streak_days', 21, false, 23),
    ('streak_30', 'Thói quen tốt', '30 ngày liên tiếp', '🌟', 'streak', 'epic', 300, 'streak_days', 30, false, 24),
    ('streak_50', 'Kỷ luật vàng', '50 ngày liên tiếp', '⭐', 'streak', 'epic', 500, 'streak_days', 50, false, 25),
    ('streak_100', 'Không thể ngăn cản', '100 ngày liên tiếp', '🏆', 'streak', 'legendary', 1000, 'streak_days', 100, false, 26),
    ('streak_200', 'Siêu nhân', '200 ngày liên tiếp', '👑', 'streak', 'legendary', 2000, 'streak_days', 200, true, 27),
    ('streak_365', 'Trọn năm kiên trì', '365 ngày - Cả năm không nghỉ!', '🎆', 'streak', 'legendary', 5000, 'streak_days', 365, true, 28),
    
    -- ===== SCORE ACHIEVEMENTS (Excellence) =====
    ('first_perfect', 'Hoàn hảo!', 'Đạt điểm 10 đầu tiên', '⭐', 'score', 'common', 100, 'perfect_scores', 1, false, 40),
    ('5_perfect', 'Ngôi sao đang lên', '5 lần điểm 10', '✨', 'score', 'common', 150, 'perfect_scores', 5, false, 41),
    ('10_perfect', 'Xuất sắc', '10 lần điểm 10', '🌟', 'score', 'rare', 200, 'perfect_scores', 10, false, 42),
    ('25_perfect', 'Hoàn hảo chủ nghĩa', '25 lần điểm 10', '💫', 'score', 'rare', 350, 'perfect_scores', 25, false, 43),
    ('50_perfect', 'Thiên tài', '50 lần điểm 10', '💎', 'score', 'epic', 500, 'perfect_scores', 50, false, 44),
    ('100_perfect', 'Hoàn hảo tuyệt đối', '100 lần điểm 10', '👑', 'score', 'legendary', 1000, 'perfect_scores', 100, true, 45),
    
    -- ===== XP ACHIEVEMENTS (Accumulation) =====
    ('xp_500', 'Bắt đầu tích lũy', 'Đạt 500 XP', '💵', 'xp', 'common', 0, 'total_xp', 500, false, 60),
    ('xp_1000', 'Tích lũy', 'Đạt 1,000 XP', '💰', 'xp', 'common', 0, 'total_xp', 1000, false, 61),
    ('xp_2500', 'Tiết kiệm', 'Đạt 2,500 XP', '💳', 'xp', 'common', 0, 'total_xp', 2500, false, 62),
    ('xp_5000', 'Giàu có', 'Đạt 5,000 XP', '💎', 'xp', 'rare', 0, 'total_xp', 5000, false, 63),
    ('xp_10000', 'Triệu phú XP', 'Đạt 10,000 XP', '💴', 'xp', 'epic', 0, 'total_xp', 10000, false, 64),
    ('xp_25000', 'Đại gia', 'Đạt 25,000 XP', '💷', 'xp', 'epic', 0, 'total_xp', 25000, false, 65),
    ('xp_50000', 'Tỷ phú XP', 'Đạt 50,000 XP', '🏛️', 'xp', 'legendary', 0, 'total_xp', 50000, false, 66),
    ('xp_100000', 'Huyền thoại XP', 'Đạt 100,000 XP', '👑', 'xp', 'legendary', 0, 'total_xp', 100000, true, 67),
    
    -- ===== LEVEL ACHIEVEMENTS (Progression) =====
    ('level_3', 'Cấp độ mới', 'Đạt level 3', '🆙', 'level', 'common', 30, 'level', 3, false, 80),
    ('level_5', 'Lên cấp', 'Đạt level 5', '⬆️', 'level', 'common', 50, 'level', 5, false, 81),
    ('level_10', 'Tiến bộ', 'Đạt level 10', '🚀', 'level', 'rare', 100, 'level', 10, false, 82),
    ('level_15', 'Học viên giỏi', 'Đạt level 15', '🌠', 'level', 'rare', 150, 'level', 15, false, 83),
    ('level_20', 'Chuyên gia', 'Đạt level 20', '🎯', 'level', 'epic', 200, 'level', 20, false, 84),
    ('level_25', 'Cao thủ', 'Đạt level 25', '🎖️', 'level', 'epic', 250, 'level', 25, false, 85),
    ('level_30', 'Bậc thầy', 'Đạt level 30', '🏅', 'level', 'epic', 300, 'level', 30, false, 86),
    ('level_40', 'Đại sư', 'Đạt level 40', '🥇', 'level', 'legendary', 400, 'level', 40, false, 87),
    ('level_50', 'Grandmaster', 'Đạt level 50', '🏆', 'level', 'legendary', 500, 'level', 50, false, 88),
    ('level_75', 'Huyền thoại', 'Đạt level 75', '👑', 'level', 'legendary', 750, 'level', 75, true, 89),
    ('level_100', 'Thánh nhân', 'Đạt level 100', '🌟', 'level', 'legendary', 1000, 'level', 100, true, 90),
    
    -- ===== SPECIAL HIDDEN ACHIEVEMENTS =====
    ('early_bird', 'Chim sớm bắt sâu', 'Làm bài thi trước 6h sáng', '🐦', 'special', 'rare', 200, 'exams_completed', 1, true, 100),
    ('night_owl', 'Cú đêm', 'Làm bài thi sau 11h đêm', '🦉', 'special', 'rare', 200, 'exams_completed', 1, true, 101),
    ('speed_demon', 'Nhanh như chớp', 'Hoàn thành bài thi trong 2 phút', '⚡', 'special', 'epic', 300, 'exams_completed', 1, true, 102),
    ('comeback_kid', 'Trở lại mạnh mẽ', 'Đạt điểm 10 sau khi trượt', '🔄', 'special', 'rare', 150, 'exams_completed', 1, true, 103),
    ('perfectionist', 'Người cầu toàn', '5 bài liên tiếp điểm 10', '✨', 'special', 'legendary', 500, 'exams_completed', 1, true, 104)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 10. SEED DATA - TITLES (20+ titles)
-- =============================================
INSERT INTO public.titles (name, display_text, color, unlock_xp, sort_order) VALUES
    -- Basic progression titles
    ('Tân binh', '🌱 Tân binh', '#94a3b8', 0, 1),
    ('Người mới', '👶 Người mới', '#a1a1aa', 100, 2),
    ('Học sinh', '📚 Học sinh', '#60a5fa', 500, 3),
    ('Học sinh ngoan', '📖 Học sinh ngoan', '#38bdf8', 1000, 4),
    ('Học sinh giỏi', '⭐ Học sinh giỏi', '#fbbf24', 2000, 5),
    ('Học sinh xuất sắc', '🌟 Học sinh xuất sắc', '#f59e0b', 3500, 6),
    ('Ngôi sao lớp', '💫 Ngôi sao lớp', '#facc15', 5000, 7),
    ('Á khoa', '🥈 Á khoa', '#d1d5db', 7500, 8),
    ('Thủ khoa', '🥇 Thủ khoa', '#fcd34d', 10000, 9),
    ('Thiên tài nhí', '💎 Thiên tài nhí', '#8b5cf6', 15000, 10),
    ('Thiên tài', '💎 Thiên tài', '#a78bfa', 20000, 11),
    ('Kỳ tài', '🔮 Kỳ tài', '#c084fc', 25000, 12),
    ('Thần đồng', '✨ Thần đồng', '#e879f9', 30000, 13),
    ('Bậc thầy', '🎓 Bậc thầy', '#06b6d4', 40000, 14),
    ('Huyền thoại', '👑 Huyền thoại', '#ef4444', 50000, 15),
    ('Đại huyền thoại', '🏆 Đại huyền thoại', '#f43f5e', 75000, 16),
    ('Grandmaster', '🔱 Grandmaster', '#ec4899', 100000, 17),
    -- Fun titles
    ('Người đam mê', '🔥 Người đam mê', '#f97316', 8000, 20),
    ('Kẻ chinh phục', '⚔️ Kẻ chinh phục', '#dc2626', 12000, 21),
    ('Chiến binh tri thức', '🛡️ Chiến binh tri thức', '#2563eb', 18000, 22),
    ('Siêu học sinh', '🦸 Siêu học sinh', '#7c3aed', 35000, 23),
    ('Thánh học', '😇 Thánh học', '#fbbf24', 60000, 24)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- DONE! Run this in Supabase SQL Editor
-- =============================================


-- >>> Migration: migration-gamification.sql <<<
-- Migration: Gamification System
-- Run this in Supabase SQL Editor

-- Student stats table
DROP TABLE IF EXISTS public.student_stats CASCADE;
CREATE TABLE public.student_stats (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    streak_days integer DEFAULT 0,
    last_exam_date date,
    exams_completed integer DEFAULT 0,
    perfect_scores integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Badges/Achievements
DROP TABLE IF EXISTS public.badges CASCADE;
CREATE TABLE public.badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    icon text,
    xp_reward integer DEFAULT 0,
    condition_type text, -- 'exams_completed', 'perfect_score', 'streak', 'first_exam'
    condition_value integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name)
);

-- Student earned badges
DROP TABLE IF EXISTS public.student_badges CASCADE;
CREATE TABLE public.student_badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    badge_id uuid REFERENCES badges NOT NULL,
    earned_at timestamptz DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_stats
DROP POLICY IF EXISTS "Users can view their own stats" ON public.student_stats;
CREATE POLICY "Users can view their own stats" ON public.student_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.student_stats;
CREATE POLICY "Users can update their own stats" ON public.student_stats
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stats" ON public.student_stats;
CREATE POLICY "Users can insert their own stats" ON public.student_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for badges (public read)
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
CREATE POLICY "Anyone can view badges" ON public.badges
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for student_badges
DROP POLICY IF EXISTS "Users can view their own badges" ON public.student_badges;
CREATE POLICY "Users can view their own badges" ON public.student_badges
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own badges" ON public.student_badges;
CREATE POLICY "Users can insert their own badges" ON public.student_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboard view policy (allow viewing others for leaderboard)
DROP POLICY IF EXISTS "Users can view all stats for leaderboard" ON public.student_stats;
CREATE POLICY "Users can view all stats for leaderboard" ON public.student_stats
    FOR SELECT TO authenticated USING (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, xp_reward, condition_type, condition_value) VALUES
    ('Người Mới', 'Hoàn thành bài thi đầu tiên', '🎯', 50, 'first_exam', 1),
    ('Streak 3', '3 ngày làm bài liên tiếp', '🔥', 100, 'streak', 3),
    ('Streak 7', '7 ngày làm bài liên tiếp', '🔥', 200, 'streak', 7),
    ('Perfect', 'Đạt điểm 10 tuyệt đối', '⭐', 150, 'perfect_score', 1),
    ('Chăm Chỉ', 'Hoàn thành 10 bài thi', '📚', 200, 'exams_completed', 10),
    ('Master', 'Hoàn thành 50 bài thi', '🏆', 500, 'exams_completed', 50)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_stats_user_id ON public.student_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_student_stats_xp ON public.student_stats(xp DESC);
CREATE INDEX IF NOT EXISTS idx_student_badges_user_id ON public.student_badges(user_id);


-- >>> Migration: migration-monetization.sql <<<
-- =============================================
-- MONETIZATION SYSTEM: Subscriptions & Marketplace
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. SUBSCRIPTION PLANS (Gói đăng ký cho Teachers)
-- =============================================
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
CREATE TABLE public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    price_monthly integer NOT NULL, -- VND
    price_yearly integer, -- VND (discount for yearly)
    features jsonb DEFAULT '[]', -- Array of feature strings
    max_exams integer DEFAULT 10,
    max_questions_per_exam integer DEFAULT 50,
    max_students integer DEFAULT 100,
    ai_grading_enabled boolean DEFAULT false,
    priority_support boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name)
);

-- =============================================
-- 2. USER SUBSCRIPTIONS (Đăng ký của người dùng)
-- =============================================
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
CREATE TABLE public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    plan_id uuid REFERENCES public.subscription_plans NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'pending')),
    billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    cancelled_at timestamptz,
    payment_provider text DEFAULT 'vnpay',
    external_subscription_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. EXAM PACKAGES (Gói đề thi bán)
-- =============================================
DROP TABLE IF EXISTS public.exam_packages CASCADE;
CREATE TABLE public.exam_packages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id uuid REFERENCES auth.users NOT NULL,
    title text NOT NULL,
    description text,
    cover_image text,
    price integer NOT NULL CHECK (price >= 0), -- VND, 0 = free
    original_price integer, -- For showing discount
    exam_ids uuid[] DEFAULT '{}',
    category text,
    tags text[] DEFAULT '{}',
    is_published boolean DEFAULT false,
    sales_count integer DEFAULT 0,
    rating_avg numeric(2,1) DEFAULT 0,
    rating_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. PURCHASES (Lịch sử mua hàng)
-- =============================================
DROP TABLE IF EXISTS public.purchases CASCADE;
CREATE TABLE public.purchases (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id uuid REFERENCES auth.users NOT NULL,
    package_id uuid REFERENCES public.exam_packages,
    subscription_id uuid REFERENCES public.user_subscriptions,
    amount integer NOT NULL, -- VND
    payment_provider text DEFAULT 'vnpay',
    payment_id text, -- VNPay transaction ID
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_url text, -- VNPay payment URL
    payment_data jsonb DEFAULT '{}', -- Full payment response
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- =============================================
-- 5. PACKAGE REVIEWS (Đánh giá gói đề)
-- =============================================
DROP TABLE IF EXISTS public.package_reviews CASCADE;
CREATE TABLE public.package_reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id uuid REFERENCES public.exam_packages NOT NULL,
    user_id uuid REFERENCES auth.users NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(package_id, user_id)
);

-- =============================================
-- 6. ENABLE RLS
-- =============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS POLICIES - SUBSCRIPTION PLANS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (is_active = true);

-- =============================================
-- 8. RLS POLICIES - USER SUBSCRIPTIONS
-- =============================================
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 9. RLS POLICIES - EXAM PACKAGES
-- =============================================
DROP POLICY IF EXISTS "Anyone can view published packages" ON public.exam_packages;
CREATE POLICY "Anyone can view published packages" ON public.exam_packages
    FOR SELECT TO authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "Creators can view own packages" ON public.exam_packages;
CREATE POLICY "Creators can view own packages" ON public.exam_packages
    FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can manage own packages" ON public.exam_packages;
CREATE POLICY "Creators can manage own packages" ON public.exam_packages
    FOR ALL USING (auth.uid() = creator_id);

-- =============================================
-- 10. RLS POLICIES - PURCHASES
-- =============================================
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases" ON public.purchases
    FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchases;
CREATE POLICY "Users can insert own purchases" ON public.purchases
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Creators can view purchases of their packages
DROP POLICY IF EXISTS "Creators can view package sales" ON public.purchases;
CREATE POLICY "Creators can view package sales" ON public.purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exam_packages
            WHERE id = purchases.package_id 
            AND creator_id = auth.uid()
        )
    );

-- =============================================
-- 11. RLS POLICIES - PACKAGE REVIEWS
-- =============================================
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.package_reviews;
CREATE POLICY "Anyone can view reviews" ON public.package_reviews
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Buyers can add reviews" ON public.package_reviews;
CREATE POLICY "Buyers can add reviews" ON public.package_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.purchases
            WHERE buyer_id = auth.uid()
            AND package_id = package_reviews.package_id
            AND payment_status = 'completed'
        )
    );

-- =============================================
-- 12. HELPER FUNCTIONS
-- =============================================

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_subscriptions
        WHERE user_id = p_user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user purchased a package
CREATE OR REPLACE FUNCTION public.has_purchased_package(p_user_id uuid, p_package_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.purchases
        WHERE buyer_id = p_user_id
        AND package_id = p_package_id
        AND payment_status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update package rating after review
CREATE OR REPLACE FUNCTION public.update_package_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.exam_packages
    SET 
        rating_avg = (SELECT AVG(rating)::numeric(2,1) FROM public.package_reviews WHERE package_id = NEW.package_id),
        rating_count = (SELECT COUNT(*) FROM public.package_reviews WHERE package_id = NEW.package_id)
    WHERE id = NEW.package_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_update_rating ON public.package_reviews;
CREATE TRIGGER on_review_update_rating
    AFTER INSERT OR UPDATE ON public.package_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_package_rating();

-- Separate trigger function for DELETE (uses OLD instead of NEW)
CREATE OR REPLACE FUNCTION public.update_package_rating_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.exam_packages
    SET 
        rating_avg = COALESCE((SELECT AVG(rating)::numeric(2,1) FROM public.package_reviews WHERE package_id = OLD.package_id), 0),
        rating_count = (SELECT COUNT(*) FROM public.package_reviews WHERE package_id = OLD.package_id)
    WHERE id = OLD.package_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_delete_rating ON public.package_reviews;
CREATE TRIGGER on_review_delete_rating
    AFTER DELETE ON public.package_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_package_rating_on_delete();

-- Increment sales count after purchase
CREATE OR REPLACE FUNCTION public.increment_sales_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
        UPDATE public.exam_packages
        SET sales_count = sales_count + 1
        WHERE id = NEW.package_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_purchase_increment_sales ON public.purchases;
CREATE TRIGGER on_purchase_increment_sales
    AFTER INSERT OR UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_sales_count();

-- =============================================
-- 13. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_exam_packages_published ON public.exam_packages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_exam_packages_creator ON public.exam_packages(creator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(payment_status);

-- =============================================
-- 14. SAMPLE DATA - SUBSCRIPTION PLANS
-- =============================================
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, max_exams, max_questions_per_exam, max_students, ai_grading_enabled, priority_support, sort_order) VALUES
    ('Miễn phí', 'Gói cơ bản cho giáo viên mới bắt đầu', 0, 0, 
     '["Tạo tối đa 5 đề thi", "50 câu hỏi/đề", "100 học sinh", "Chấm điểm tự động"]'::jsonb,
     5, 50, 100, false, false, 1),
    ('Pro', 'Dành cho giáo viên chuyên nghiệp', 99000, 990000,
     '["Tạo không giới hạn đề thi", "200 câu hỏi/đề", "500 học sinh", "Chấm điểm AI tự luận", "Xuất Excel/PDF", "Hỗ trợ ưu tiên"]'::jsonb,
     -1, 200, 500, true, true, 2),
    ('Enterprise', 'Dành cho trường học và tổ chức', 299000, 2990000,
     '["Tất cả tính năng Pro", "Không giới hạn học sinh", "API truy cập", "Quản lý nhiều giáo viên", "Training & onboarding", "SLA 99.9%"]'::jsonb,
     -1, 500, -1, true, true, 3)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- DONE! Run this migration in Supabase SQL Editor
-- =============================================


-- >>> Migration: migration-phase6-scheduled-exams.sql <<<
-- ============================================================================
-- Phase 6: Scheduled Exams & Anti-Cheat System
-- ============================================================================

-- 1. Add scheduling fields to exams table
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS start_time timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN exams.start_time IS 'Thời gian bắt đầu cho phép làm bài';
COMMENT ON COLUMN exams.end_time IS 'Thời gian kết thúc, sau đó không cho làm bài';
COMMENT ON COLUMN exams.is_scheduled IS 'True nếu đề có giới hạn thời gian mở';

-- ============================================================================
-- 2. Exam Sessions - Theo dõi phiên làm bài
-- ============================================================================

DROP TABLE IF EXISTS exam_sessions CASCADE;
CREATE TABLE exam_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session tracking
    session_number integer DEFAULT 1,         -- Phiên thứ mấy
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    
    -- Status
    status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    is_ranked boolean DEFAULT true,           -- Có được tính xếp hạng không
    
    -- Anti-cheat flags
    browser_fingerprint text,                 -- Để detect multi-browser
    tab_switch_count integer DEFAULT 0,       -- Số lần chuyển tab
    visibility_changes integer DEFAULT 0,     -- Số lần ẩn/hiện tab
    multi_browser_detected boolean DEFAULT false,
    
    -- Thời gian thực tế
    time_spent integer DEFAULT 0,             -- Thời gian làm bài (giây)
    last_active_at timestamptz DEFAULT now(),
    
    -- Answers snapshot (để tiếp tục làm bài)
    answers_snapshot jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Unique constraint: 1 student có thể có nhiều session cho 1 exam
    UNIQUE(exam_id, student_id, session_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_active ON exam_sessions(exam_id, student_id, status) 
    WHERE status = 'in_progress';

-- ============================================================================
-- 3. Update submissions table
-- ============================================================================

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES exam_sessions(id),
ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cheat_flags jsonb DEFAULT '{}';

COMMENT ON COLUMN submissions.is_ranked IS 'False nếu không được tính vào bảng xếp hạng (gian lận hoặc làm lại)';
COMMENT ON COLUMN submissions.cheat_flags IS 'Các cờ gian lận: tab_switches, multi_browser, etc.';

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- Students can view/manage their own sessions
DROP POLICY IF EXISTS "Students can view own sessions" ON exam_sessions;
CREATE POLICY "Students can view own sessions"
    ON exam_sessions FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own sessions" ON exam_sessions;
CREATE POLICY "Students can insert own sessions"
    ON exam_sessions FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update own sessions" ON exam_sessions;
CREATE POLICY "Students can update own sessions"
    ON exam_sessions FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

-- Teachers can view sessions for their exams
DROP POLICY IF EXISTS "Teachers can view exam sessions" ON exam_sessions;
CREATE POLICY "Teachers can view exam sessions"
    ON exam_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_sessions.exam_id 
            AND exams.teacher_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function: Check if exam is currently open
CREATE OR REPLACE FUNCTION is_exam_open(exam_id_input uuid)
RETURNS boolean AS $$
DECLARE
    exam_record RECORD;
BEGIN
    SELECT is_scheduled, start_time, end_time, status
    INTO exam_record
    FROM exams WHERE id = exam_id_input;
    
    -- Not found or not published
    IF exam_record IS NULL OR exam_record.status != 'published' THEN
        RETURN false;
    END IF;
    
    -- Not scheduled = always open
    IF NOT exam_record.is_scheduled THEN
        RETURN true;
    END IF;
    
    -- Check time window
    IF exam_record.start_time IS NOT NULL AND NOW() < exam_record.start_time THEN
        RETURN false; -- Chưa đến giờ
    END IF;
    
    IF exam_record.end_time IS NOT NULL AND NOW() > exam_record.end_time THEN
        RETURN false; -- Đã hết giờ
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get or create session for student
CREATE OR REPLACE FUNCTION get_or_create_exam_session(
    exam_id_input uuid,
    browser_fp text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    existing_session exam_sessions%ROWTYPE;
    new_session_id uuid;
    session_count integer;
BEGIN
    -- Check for active session
    SELECT * INTO existing_session
    FROM exam_sessions
    WHERE exam_id = exam_id_input 
    AND student_id = auth.uid()
    AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Return existing if found
    IF existing_session.id IS NOT NULL THEN
        -- Check multi-browser
        IF browser_fp IS NOT NULL 
           AND existing_session.browser_fingerprint IS NOT NULL 
           AND existing_session.browser_fingerprint != browser_fp THEN
            -- Mark as multi-browser detected
            UPDATE exam_sessions 
            SET multi_browser_detected = true, is_ranked = false
            WHERE id = existing_session.id;
        END IF;
        
        RETURN existing_session.id;
    END IF;
    
    -- Count existing sessions
    SELECT COUNT(*) INTO session_count
    FROM exam_sessions
    WHERE exam_id = exam_id_input AND student_id = auth.uid();
    
    -- Create new session
    INSERT INTO exam_sessions (
        exam_id, 
        student_id, 
        session_number,
        browser_fingerprint,
        is_ranked
    ) VALUES (
        exam_id_input,
        auth.uid(),
        session_count + 1,
        browser_fp,
        session_count = 0  -- Chỉ session đầu tiên được ranked
    )
    RETURNING id INTO new_session_id;
    
    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record tab switch
CREATE OR REPLACE FUNCTION record_tab_switch(session_id_input uuid)
RETURNS void AS $$
BEGIN
    UPDATE exam_sessions
    SET 
        tab_switch_count = tab_switch_count + 1,
        visibility_changes = visibility_changes + 1,
        last_active_at = NOW(),
        -- Auto-invalidate if too many switches (>5)
        is_ranked = CASE 
            WHEN tab_switch_count >= 5 THEN false 
            ELSE is_ranked 
        END
    WHERE id = session_id_input AND student_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Save answer snapshot
CREATE OR REPLACE FUNCTION save_answer_snapshot(
    session_id_input uuid,
    answers jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE exam_sessions
    SET 
        answers_snapshot = answers,
        last_active_at = NOW(),
        time_spent = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
    WHERE id = session_id_input AND student_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> Migration: migration-question-types-v2.sql <<<
-- ============================================================================
-- Add question_type to questions table (True/False, Short Answer support)
-- ============================================================================

-- Add question_type column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type text 
    DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer'));

-- short_answer needs different validation - correct_answer can be longer text
-- true_false: correct_answer is 'Đ' or 'S'
-- multiple_choice: correct_answer is 'A', 'B', 'C', 'D'

COMMENT ON COLUMN questions.question_type IS 'Type of question: multiple_choice, true_false, or short_answer';

-- Update existing questions to have explicit type
UPDATE questions SET question_type = 'multiple_choice' WHERE question_type IS NULL;


-- >>> Migration: migration-question-types.sql <<<
-- Migration: Add question types support
-- Run this in Supabase SQL Editor

-- Add answer type columns to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS mc_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_answers jsonb DEFAULT '[]';

-- mc_answers: [{"question": 1, "answer": "D"}, ...]
-- tf_answers: [{"question": 13, "a": true, "b": true, "c": false, "d": true}, ...]
-- sa_answers: [{"question": 17, "answer": 18}, ...]

-- Update submissions table for different answer types
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_student_answers jsonb DEFAULT '[]';

-- Add score breakdown
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tf_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sa_correct integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(status);

COMMENT ON COLUMN public.exams.mc_answers IS 'Multiple choice answers (A/B/C/D)';
COMMENT ON COLUMN public.exams.tf_answers IS 'True/False (Đúng/Sai) answers with 4 sub-questions each';
COMMENT ON COLUMN public.exams.sa_answers IS 'Short answer (numeric) with tolerance range';


-- >>> Migration: migration-resources.sql <<<
-- ============================================================================
-- Migration: Resources Table (Kho Tài Liệu & Đề)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create resources table
DROP TABLE IF EXISTS resources CASCADE;
CREATE TABLE resources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    type text NOT NULL CHECK (type IN ('document', 'exam')),
    subject text CHECK (subject IN ('math', 'physics', 'chemistry', 'english', 'literature', 'biology', 'history', 'geography', 'other')),
    file_url text NOT NULL,
    thumbnail_url text,
    description text,
    tags text[] DEFAULT '{}',
    uploader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    download_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_uploader ON resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);

-- 3. Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Everyone can read resources (public library)
DROP POLICY IF EXISTS "Anyone can view resources" ON resources;
CREATE POLICY "Anyone can view resources"
    ON resources FOR SELECT
    USING (true);

-- Only authenticated users can insert
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON resources;
CREATE POLICY "Authenticated users can upload resources"
    ON resources FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploader_id);

-- Uploaders can update their own resources
DROP POLICY IF EXISTS "Uploaders can update own resources" ON resources;
CREATE POLICY "Uploaders can update own resources"
    ON resources FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- Uploaders can delete their own resources
DROP POLICY IF EXISTS "Uploaders can delete own resources" ON resources;
CREATE POLICY "Uploaders can delete own resources"
    ON resources FOR DELETE
    TO authenticated
    USING (auth.uid() = uploader_id);

-- 5. Function to increment view count
CREATE OR REPLACE FUNCTION increment_resource_view(resource_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE resources 
    SET view_count = view_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to increment download count
CREATE OR REPLACE FUNCTION increment_resource_download(resource_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE resources 
    SET download_count = download_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Insert sample data (optional)
-- INSERT INTO resources (title, type, subject, file_url, description, tags) VALUES
-- ('Đề thi thử THPT 2026 - Lần 1', 'exam', 'math', 'https://example.com/de1.pdf', 'Đề chuẩn cấu trúc mới BGD', ARRAY['THPT 2026', 'đại số', 'hình học']),
-- ('Tóm tắt công thức Toán 12', 'document', 'math', 'https://example.com/congthuc.pdf', 'Tổng hợp công thức cần nhớ', ARRAY['công thức', 'ôn thi']);

-- ============================================================================
-- Storage bucket for resources (run separately if needed)
-- ============================================================================
-- In Supabase Dashboard > Storage > Create new bucket:
-- Name: resources
-- Public: Yes (for easy access)
-- File size limit: 20MB

-- ============================================================================
-- Live Schedule Table (Lịch live stream)
-- ============================================================================

DROP TABLE IF EXISTS live_schedule CASCADE;
CREATE TABLE live_schedule (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    day text NOT NULL,           -- 'Thứ 7', 'Chủ nhật'
    time text NOT NULL,          -- '20:00 - 22:00'
    topic text NOT NULL,         -- 'Chữa đề Toán THPT 2026'
    host text,                   -- 'Thầy Ái'
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE live_schedule ENABLE ROW LEVEL SECURITY;

-- Everyone can view schedule
DROP POLICY IF EXISTS "Anyone can view schedule" ON live_schedule;
CREATE POLICY "Anyone can view schedule"
    ON live_schedule FOR SELECT
    USING (true);

-- Only authenticated users can manage
DROP POLICY IF EXISTS "Authenticated users can insert schedule" ON live_schedule;
CREATE POLICY "Authenticated users can insert schedule"
    ON live_schedule FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update schedule" ON live_schedule;
CREATE POLICY "Authenticated users can update schedule"
    ON live_schedule FOR UPDATE
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete schedule" ON live_schedule;
CREATE POLICY "Authenticated users can delete schedule"
    ON live_schedule FOR DELETE
    TO authenticated
    USING (true);

-- Insert default schedule
-- Only insert default schedule if table is empty
INSERT INTO live_schedule (day, time, topic, host, sort_order)
SELECT * FROM (VALUES
    ('Thứ 7', '20:00 - 22:00', 'Chữa đề Toán THPT 2026', 'Thầy Ái', 1),
    ('Chủ nhật', '19:00 - 21:00', 'Giải đề Vật Lý', 'Thầy Minh', 2)
) AS v(day, time, topic, host, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM live_schedule LIMIT 1);


-- >>> Migration: migration-retake-whitelist.sql <<<
-- Migration: Exam Retake & Teacher Whitelist
-- Run this in Supabase SQL Editor

-- 1. Add max_attempts to exams table
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1;

-- COMMENT: max_attempts = 1 means students can only take once (default)
-- max_attempts = 0 means unlimited retakes
-- max_attempts = N means students can take up to N times

-- 2. Add attempt_number to submissions table to track retakes
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;

-- 3. Create teacher_whitelist table for authorized teacher emails
DROP TABLE IF EXISTS public.teacher_whitelist CASCADE;
CREATE TABLE public.teacher_whitelist (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text NOT NULL UNIQUE,
    added_by uuid REFERENCES auth.users,
    added_at timestamptz DEFAULT now(),
    note text
);

-- 4. Enable RLS
ALTER TABLE public.teacher_whitelist ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for teacher_whitelist
-- Only authenticated users can read (to check if they're a teacher)
DROP POLICY IF EXISTS "Authenticated users can view whitelist" ON public.teacher_whitelist;
CREATE POLICY "Authenticated users can view whitelist" ON public.teacher_whitelist
    FOR SELECT TO authenticated USING (true);

-- Only existing teachers (those in whitelist) can add new teachers
DROP POLICY IF EXISTS "Teachers can add to whitelist" ON public.teacher_whitelist;
CREATE POLICY "Teachers can add to whitelist" ON public.teacher_whitelist
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.teacher_whitelist 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- 6. Insert default teacher emails (CUSTOMIZE THESE!)
INSERT INTO public.teacher_whitelist (email, note) VALUES
    ('ptan12209@gmail.com', 'Admin teacher'),
    ('accmua1m@gmail.com', 'Default teacher')
ON CONFLICT (email) DO NOTHING;

-- 7. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_whitelist_email ON public.teacher_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student ON public.submissions(exam_id, student_id);

-- 8. Helper function to check if user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher(user_email text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.teacher_whitelist WHERE email = user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- >>> Migration: migration-rewards-shop.sql <<<
-- =============================================
-- GAMIFICATION EXPANSION: Rewards Shop & Challenges
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. REWARDS TABLE (Phần thưởng có thể đổi XP)
-- =============================================
DROP TABLE IF EXISTS public.rewards CASCADE;
CREATE TABLE public.rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    icon text DEFAULT '🎁',
    xp_cost integer NOT NULL CHECK (xp_cost > 0),
    stock integer DEFAULT -1, -- -1 = unlimited
    category text CHECK (category IN ('avatar', 'badge', 'bonus', 'physical')),
    metadata jsonb DEFAULT '{}', -- For avatar URLs, badge data, etc.
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(name)
);

-- =============================================
-- 2. STUDENT REWARDS (Phần thưởng đã đổi)
-- =============================================
DROP TABLE IF EXISTS public.student_rewards CASCADE;
CREATE TABLE public.student_rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    reward_id uuid REFERENCES public.rewards NOT NULL,
    redeemed_at timestamptz DEFAULT now(),
    status text DEFAULT 'delivered' CHECK (status IN ('pending', 'delivered', 'cancelled')),
    UNIQUE(user_id, reward_id, redeemed_at) -- Allow multiple redemptions of same reward
);

-- =============================================
-- 3. WEEKLY CHALLENGES (Thử thách hàng tuần)
-- =============================================
DROP TABLE IF EXISTS public.weekly_challenges CASCADE;
CREATE TABLE public.weekly_challenges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    icon text DEFAULT '🏆',
    xp_reward integer DEFAULT 100 CHECK (xp_reward >= 0),
    target_type text NOT NULL CHECK (target_type IN ('exams_count', 'perfect_scores', 'streak', 'total_score')),
    target_value integer NOT NULL DEFAULT 1 CHECK (target_value > 0),
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    CHECK (end_date >= start_date),
    UNIQUE(title, start_date)
);

-- =============================================
-- 4. STUDENT CHALLENGES (Tiến độ thử thách)
-- =============================================
DROP TABLE IF EXISTS public.student_challenges CASCADE;
CREATE TABLE public.student_challenges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    challenge_id uuid REFERENCES public.weekly_challenges NOT NULL,
    progress integer DEFAULT 0 CHECK (progress >= 0),
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- =============================================
-- 5. ENABLE RLS
-- =============================================
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES - REWARDS
-- =============================================
-- Anyone authenticated can view active rewards
DROP POLICY IF EXISTS "View active rewards" ON public.rewards;
CREATE POLICY "View active rewards" ON public.rewards
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Teachers can manage rewards
DROP POLICY IF EXISTS "Teachers manage rewards" ON public.rewards;
CREATE POLICY "Teachers manage rewards" ON public.rewards
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- =============================================
-- 7. RLS POLICIES - STUDENT REWARDS
-- =============================================
-- Users can view their own redeemed rewards
DROP POLICY IF EXISTS "View own rewards" ON public.student_rewards;
CREATE POLICY "View own rewards" ON public.student_rewards
    FOR SELECT USING (auth.uid() = user_id);

-- Users can redeem rewards (insert)
DROP POLICY IF EXISTS "Redeem rewards" ON public.student_rewards;
CREATE POLICY "Redeem rewards" ON public.student_rewards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. RLS POLICIES - WEEKLY CHALLENGES
-- =============================================
-- Anyone authenticated can view active challenges
DROP POLICY IF EXISTS "View active challenges" ON public.weekly_challenges;
CREATE POLICY "View active challenges" ON public.weekly_challenges
    FOR SELECT TO authenticated
    USING (is_active = true AND end_date >= CURRENT_DATE);

-- Teachers can manage challenges
DROP POLICY IF EXISTS "Teachers manage challenges" ON public.weekly_challenges;
CREATE POLICY "Teachers manage challenges" ON public.weekly_challenges
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- =============================================
-- 9. RLS POLICIES - STUDENT CHALLENGES
-- =============================================
-- Users can view their own challenge progress
DROP POLICY IF EXISTS "View own challenge progress" ON public.student_challenges;
CREATE POLICY "View own challenge progress" ON public.student_challenges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert/update their own progress
DROP POLICY IF EXISTS "Update own challenge progress" ON public.student_challenges;
CREATE POLICY "Update own challenge progress" ON public.student_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Modify own challenge progress" ON public.student_challenges;
CREATE POLICY "Modify own challenge progress" ON public.student_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- redeem_reward function REMOVED (using secure version from migration-fix-rpc-functions.sql)

-- Function to update challenge progress after exam completion
CREATE OR REPLACE FUNCTION public.update_challenge_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge RECORD;
    v_current_progress integer;
    v_score numeric;
BEGIN
    v_score := NEW.score;
    
    -- Loop through active challenges
    FOR v_challenge IN 
        SELECT * FROM public.weekly_challenges 
        WHERE is_active = true 
        AND CURRENT_DATE BETWEEN start_date AND end_date
    LOOP
        -- Get or create student challenge record
        INSERT INTO public.student_challenges (user_id, challenge_id, progress)
        VALUES (NEW.student_id, v_challenge.id, 0)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Calculate new progress based on challenge type
        CASE v_challenge.target_type
            WHEN 'exams_count' THEN
                UPDATE public.student_challenges 
                SET progress = progress + 1,
                    completed = (progress + 1 >= v_challenge.target_value),
                    completed_at = CASE WHEN progress + 1 >= v_challenge.target_value THEN now() ELSE NULL END
                WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
                
            WHEN 'perfect_scores' THEN
                IF v_score >= 10 THEN
                    UPDATE public.student_challenges 
                    SET progress = progress + 1,
                        completed = (progress + 1 >= v_challenge.target_value),
                        completed_at = CASE WHEN progress + 1 >= v_challenge.target_value THEN now() ELSE NULL END
                    WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
                END IF;
                
            WHEN 'total_score' THEN
                UPDATE public.student_challenges 
                SET progress = progress + v_score::integer,
                    completed = (progress + v_score::integer >= v_challenge.target_value),
                    completed_at = CASE WHEN progress + v_score::integer >= v_challenge.target_value THEN now() ELSE NULL END
                WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
        END CASE;
        
        -- Award XP if just completed
        IF EXISTS (
            SELECT 1 FROM public.student_challenges 
            WHERE user_id = NEW.student_id 
            AND challenge_id = v_challenge.id 
            AND completed = true 
            AND completed_at = now()
        ) THEN
            UPDATE public.student_stats
            SET xp = xp + v_challenge.xp_reward
            WHERE user_id = NEW.student_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for challenge progress
DROP TRIGGER IF EXISTS on_submission_update_challenges ON public.submissions;
CREATE TRIGGER on_submission_update_challenges
    AFTER INSERT ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_challenge_progress();

-- =============================================
-- 11. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_rewards_active ON public.rewards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_rewards_user ON public.student_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_dates ON public.weekly_challenges(start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_challenges_user ON public.student_challenges(user_id);

-- =============================================
-- 12. SAMPLE DATA
-- =============================================
-- Sample rewards
INSERT INTO public.rewards (name, description, icon, xp_cost, category, stock) VALUES
    ('Avatar Vàng', 'Khung avatar màu vàng đặc biệt', '👑', 500, 'avatar', -1),
    ('Avatar Bạc', 'Khung avatar màu bạc', '🥈', 200, 'avatar', -1),
    ('Badge VIP', 'Huy hiệu VIP hiển thị bên tên', '⭐', 1000, 'badge', 100),
    ('+50 XP Bonus', 'Cộng thêm 50 XP ngay lập tức', '💎', 100, 'bonus', -1),
    ('Skip 1 câu hỏi', 'Bỏ qua 1 câu trong bài thi tiếp theo', '⏭️', 300, 'bonus', -1)
ON CONFLICT (name) DO NOTHING;

-- Sample weekly challenges (for current week)
INSERT INTO public.weekly_challenges (title, description, icon, xp_reward, target_type, target_value, start_date, end_date) VALUES
    ('Chăm Chỉ', 'Hoàn thành 5 bài thi trong tuần', '📚', 150, 'exams_count', 5, 
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
    ('Hoàn Hảo', 'Đạt 2 điểm 10 trong tuần', '💯', 200, 'perfect_scores', 2,
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
    ('Tích Lũy', 'Đạt tổng cộng 30 điểm trong tuần', '📈', 100, 'total_score', 30,
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date)
ON CONFLICT (title, start_date) DO NOTHING;

-- =============================================
-- DONE! Run this migration in Supabase SQL Editor
-- =============================================


-- >>> Migration: migration-score-visibility.sql <<<
-- =============================================
-- MIGRATION: Score Visibility Configuration
-- Created: 2026-02-05
-- Description: Add score visibility controls to exams
--   - Always show (default for existing exams)
--   - Never show (teacher grading mode)
--   - Threshold-based (show only if score >= threshold)
-- =============================================

-- Add score visibility mode column
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS score_visibility_mode TEXT NOT NULL DEFAULT 'always' 
  CHECK (score_visibility_mode IN ('always', 'never', 'threshold'));

-- Add threshold column for conditional visibility
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS score_visibility_threshold NUMERIC(5,2);

-- Add comments for documentation
COMMENT ON COLUMN public.exams.score_visibility_mode IS 
  'Controls when students can view their scores: always (default), never, or threshold';

COMMENT ON COLUMN public.exams.score_visibility_threshold IS 
  'Minimum score required to view results (only used when mode=threshold). Example: 5.0 means students need >= 5.0 to see their score';

-- Set default threshold for existing exams with 'threshold' mode (if any)
UPDATE public.exams 
SET score_visibility_threshold = 5.0 
WHERE score_visibility_mode = 'threshold' 
  AND score_visibility_threshold IS NULL;

-- Verification query (run separately to check)
-- SELECT id, title, score_visibility_mode, score_visibility_threshold 
-- FROM public.exams 
-- LIMIT 5;


-- >>> Migration: migration-sync-questions.sql <<<
-- NOTE: Diagnostic queries removed. Only schema changes retained.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '["A","B","C","D"]';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();


-- >>> Migration: migration-youtube-live.sql <<<
-- Migration: Add live_config table for YouTube Live integration
-- Run this in Supabase SQL Editor

-- Create live_config table
DROP TABLE IF EXISTS live_config CASCADE;
CREATE TABLE live_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT,
    youtube_chat_enabled BOOLEAN DEFAULT true,
    is_live BOOLEAN DEFAULT false,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE live_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
DROP POLICY IF EXISTS "Anyone can read live config" ON live_config;
CREATE POLICY "Anyone can read live config"
ON live_config FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only teachers can update
DROP POLICY IF EXISTS "Teachers can update live config" ON live_config;
CREATE POLICY "Teachers can update live config"
ON live_config FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Policy: Only teachers can insert
DROP POLICY IF EXISTS "Teachers can insert live config" ON live_config;
CREATE POLICY "Teachers can insert live config"
ON live_config FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Insert default row if needed
INSERT INTO live_config (youtube_video_id, youtube_chat_enabled, is_live, title)
SELECT null, true, false, 'Buổi Live Chữa Đề'
WHERE NOT EXISTS (SELECT 1 FROM live_config LIMIT 1);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_config_updated_at ON live_config;
CREATE TRIGGER live_config_updated_at
BEFORE UPDATE ON live_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


-- >>> Migration: storage-policies-avatars.sql <<<
-- FIXED Storage Policies for avatars bucket
-- DELETE old policies first, then run this

-- 1. Remove old policies (if any)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 2. Simple policy: Allow authenticated users to upload to avatars bucket
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Allow users to update files that start with their user ID
DROP POLICY IF EXISTS "Users can update their own avatar files" ON storage.objects;
CREATE POLICY "Users can update their own avatar files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)) LIKE (auth.uid()::text || '%')
);

-- 4. Allow users to delete files that start with their user ID
DROP POLICY IF EXISTS "Users can delete their own avatar files" ON storage.objects;
CREATE POLICY "Users can delete their own avatar files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.filename(name)) LIKE (auth.uid()::text || '%')
);

-- 5. Allow public to view avatars (read-only)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');


-- ============================================================================
-- EXAM PARTICIPANTS TABLE (used by performance indexes)
-- ============================================================================
DROP TABLE IF EXISTS public.exam_participants CASCADE;
CREATE TABLE public.exam_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'moderator')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(exam_id, user_id)
);

ALTER TABLE public.exam_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own participation" ON public.exam_participants;
CREATE POLICY "Users can view own participation" ON public.exam_participants
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can join exams" ON public.exam_participants;
CREATE POLICY "Users can join exams" ON public.exam_participants
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ========================================================
-- SECTION 3: PERFORMANCE INDEXES & OPTIMIZATIONS
-- ========================================================
-- >>> Optimization: 20260508_add_performance_indexes.sql <<<
-- =============================================
-- SC-08: Performance Indexes Migration
-- Date: 2026-05-08
-- Description: Add missing indexes for frequently queried columns
--   - submissions.exam_id: used in leaderboard, exam results, filtering
--   - exam_participants(exam_id, user_id): used in access checks, participant lookups
-- =============================================

-- Single-column index on submissions.exam_id for pure exam-level queries
-- (complements the existing composite idx_submissions_exam_student)
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id
    ON submissions(exam_id);

-- Composite index on exam_participants for fast access/role lookups
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam_user
    ON exam_participants(exam_id, user_id);

-- Update query planner statistics after adding indexes
ANALYZE submissions;
ANALYZE exam_participants;


-- >>> Optimization: migration-performance.sql <<<
-- =============================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 2.1 DATABASE INDEXES
-- =============================================

-- Submissions table indexes (most critical for leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_submissions_exam_student 
    ON submissions(exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_score 
    ON submissions(exam_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_exam_ranked 
    ON submissions(exam_id, is_ranked, score DESC) 
    WHERE is_ranked = true;

CREATE INDEX IF NOT EXISTS idx_submissions_student_recent 
    ON submissions(student_id, submitted_at DESC);

-- Exams table indexes
CREATE INDEX IF NOT EXISTS idx_exams_status_created 
    ON exams(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exams_teacher_status 
    ON exams(teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_exams_published 
    ON exams(status) 
    WHERE status = 'published';

-- Exam sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_exam_student 
    ON exam_sessions(exam_id, student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_student_active 
    ON exam_sessions(student_id, status) 
    WHERE status = 'in_progress';

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role 
    ON profiles(role);

-- Audit log indexes moved to after table creation (Section 4)

-- =============================================
-- ANALYZE TABLES (Update statistics for query planner)
-- =============================================
ANALYZE submissions;
ANALYZE exams;
ANALYZE exam_sessions;
ANALYZE profiles;

-- =============================================
-- OPTIONAL: Create materialized view for leaderboard (faster reads)
-- Uncomment if you have high traffic on leaderboards
-- =============================================

-- CREATE MATERIALIZED VIEW IF NOT EXISTS mv_exam_leaderboards AS
-- SELECT 
--     s.exam_id,
--     s.student_id,
--     p.full_name as student_name,
--     p.avatar_url,
--     s.score,
--     s.time_spent,
--     s.submitted_at,
--     ROW_NUMBER() OVER (
--         PARTITION BY s.exam_id 
--         ORDER BY s.score DESC, s.time_spent ASC
--     ) as rank
-- FROM submissions s
-- JOIN profiles p ON s.student_id = p.id
-- WHERE s.is_ranked = true;

-- CREATE UNIQUE INDEX ON mv_exam_leaderboards(exam_id, student_id);
-- CREATE INDEX ON mv_exam_leaderboards(exam_id, rank);

-- To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_exam_leaderboards;


-- ========================================================
-- SECTION 4: SECURITY POLICIES, RLS & INTEGRITY FIXES
-- ========================================================
-- >>> Security & RLS Patch: fix-rls.sql <<<
-- =============================================
-- FIX RLS FOR PROFILES TABLE
-- Run this AFTER the main schema
-- =============================================

-- Drop existing policies
drop policy if exists "Users can insert own profile" on public.profiles;

-- Create more permissive insert policy
-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Alternative: Disable RLS temporarily for testing (NOT for production!)
-- alter table public.profiles disable row level security;


-- REMOVED: Complete RLS disable script (migration-complete-rls-fix.sql)
-- This disabled RLS on submissions, exam_sessions, exams which is a security risk.
-- RLS should remain enabled with proper policies.


-- >>> Security & RLS Patch: migration-fix-delete-exam.sql <<<
-- Migration: Fix foreign key constraints to allow exam deletion
-- Run this in Supabase SQL Editor

-- 1. Fix submission_audit_log FK (the main blocker)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'submission_audit_log' AND table_schema = 'public') THEN
        -- Delete orphaned audit log entries referencing exams that no longer exist
        DELETE FROM public.submission_audit_log WHERE exam_id IS NOT NULL AND exam_id NOT IN (SELECT id FROM public.exams);

        ALTER TABLE submission_audit_log 
            DROP CONSTRAINT IF EXISTS submission_audit_log_exam_id_fkey;
        ALTER TABLE submission_audit_log 
            ADD CONSTRAINT submission_audit_log_exam_id_fkey 
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Fix exam_participants FK (if exists without cascade)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_participants') THEN
        ALTER TABLE exam_participants 
            DROP CONSTRAINT IF EXISTS exam_participants_exam_id_fkey;
        ALTER TABLE exam_participants 
            ADD CONSTRAINT exam_participants_exam_id_fkey 
            FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Fix exam_sessions FK (if missing cascade)
ALTER TABLE exam_sessions 
    DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;

ALTER TABLE exam_sessions 
    ADD CONSTRAINT exam_sessions_exam_id_fkey 
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- 4. Verify all FK constraints on exams are CASCADE (diagnostic query - run separately)
-- SELECT tc.constraint_name, tc.table_name, kcu.column_name, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
-- WHERE kcu.column_name = 'exam_id'
-- ORDER BY tc.table_name;


-- >>> Security & RLS Patch: migration-fix-rls-submissions.sql <<<
-- Fix RLS policy to prevent FOR UPDATE error
-- Run this in Supabase SQL Editor

-- First, check current policies
-- SELECT * FROM pg_policies WHERE tablename = 'submissions';

-- Option 1: Temporarily disable RLS (NOT recommended for production)
-- ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- Option 2: Drop problematic policies and recreate without FOR UPDATE

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their exams" ON public.submissions;

-- Recreate policies without FOR UPDATE issues
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
CREATE POLICY "Students can view own submissions" 
ON public.submissions FOR SELECT 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
CREATE POLICY "Students can insert own submissions" 
ON public.submissions FOR INSERT 
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
CREATE POLICY "Students can update own submissions" 
ON public.submissions FOR UPDATE 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view submissions for their exams" ON public.submissions;
CREATE POLICY "Teachers can view submissions for their exams" 
ON public.submissions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.exams 
        WHERE exams.id = submissions.exam_id 
        AND exams.teacher_id = auth.uid()
    )
);

-- Make sure RLS is enabled
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;


-- >>> Security & RLS Patch: migration-fix-submissions.sql <<<
-- Migration: Add missing columns for exam submissions
-- Run this in Supabase SQL Editor IMMEDIATELY to fix submission bug

-- Add session tracking columns
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cheat_flags jsonb DEFAULT '{}';

-- Add detailed answer columns (for new question types)
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS mc_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tf_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sa_student_answers jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS mc_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tf_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sa_correct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;

-- Add if not exists
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS time_spent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_count integer DEFAULT 0;

COMMENT ON COLUMN public.submissions.session_id IS 'Optional session ID for ranked exams';
COMMENT ON COLUMN public.submissions.is_ranked IS 'Whether this submission counts for leaderboard';
COMMENT ON COLUMN public.submissions.cheat_flags IS 'Cheat detection data {tab_switches, multi_browser, etc}';


-- REMOVED: Nuclear RLS disable script (migration-nuclear-rls-fix.sql)
-- This was disabling RLS on ALL tables which is a security risk.


-- >>> Security & RLS Patch: migration-security-fix.sql <<<
-- =============================================
-- SECURITY FIX MIGRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create secure function to get leaderboard (hides student_answers)
CREATE OR REPLACE FUNCTION get_exam_leaderboard(exam_uuid UUID)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    score NUMERIC(5,2),
    time_spent INTEGER,
    submitted_at TIMESTAMPTZ,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.student_id,
        p.full_name as student_name,
        s.score,
        s.time_spent,
        s.submitted_at,
        ROW_NUMBER() OVER (ORDER BY s.score DESC, s.time_spent ASC) as rank
    FROM submissions s
    JOIN profiles p ON s.student_id = p.id
    WHERE s.exam_id = exam_uuid
    AND s.is_ranked = true
    ORDER BY s.score DESC, s.time_spent ASC
    LIMIT 100;
END;
$$;

-- 2. Create secure function to get exam for students (without answers)
CREATE OR REPLACE FUNCTION get_exam_for_student(exam_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    duration INTEGER,
    total_questions INTEGER,
    pdf_url TEXT,
    is_scheduled BOOLEAN,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    max_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.duration,
        e.total_questions,
        e.pdf_url,
        e.is_scheduled,
        e.start_time,
        e.end_time,
        e.max_attempts
    FROM exams e
    WHERE e.id = exam_uuid
    AND e.status = 'published';
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_exam_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_exam_for_student(UUID) TO authenticated;

-- =============================================
-- NOTE: The following are RECOMMENDED but may break existing functionality
-- Only run after testing the new API routes work correctly
-- =============================================

-- OPTIONAL: Restrict what columns students can see from exams table
-- This prevents direct access to answer keys via RLS
-- 
-- DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON exams;
-- 
-- CREATE POLICY "Published exams basic info only"
--   ON exams FOR SELECT
--   USING (
--     status = 'published' 
--     OR teacher_id = auth.uid()
--   );
-- 
-- Note: With the new API approach, the client no longer directly queries
-- the exams table for students taking exams, so this is extra protection.

-- =============================================
-- RECOMMENDED: Audit log for suspicious submissions
-- =============================================

DROP TABLE IF EXISTS submission_audit_log CASCADE;
CREATE TABLE submission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE submission_audit_log ENABLE ROW LEVEL SECURITY;

-- Only teachers can view audit logs for their exams
DROP POLICY IF EXISTS "Teachers can view audit logs" ON submission_audit_log;
CREATE POLICY "Teachers can view audit logs"
    ON submission_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.id = submission_audit_log.exam_id
            AND exams.teacher_id = auth.uid()
        )
    );

-- System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON submission_audit_log;
CREATE POLICY "System can insert audit logs"
    ON submission_audit_log FOR INSERT
    WITH CHECK (true);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_exam 
    ON submission_audit_log(exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_student 
    ON submission_audit_log(student_id, created_at DESC);


-- >>> Security & RLS Patch: migration-security-level.sql <<<
-- Migration: Add security_level column to exams table
-- Run this in Supabase SQL Editor

-- security_level: 0 = no anti-cheat, 1 = basic (tab/fullscreen), 2 = + webcam, 3 = + audio, 4 = + face AI
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS security_level integer DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.exams.security_level IS 'Anti-cheat level: 0=off, 1=basic(tab+fullscreen), 2=+webcam, 3=+audio, 4=+face_detection';


-- >>> Security & RLS Patch: migration-security-patch.sql <<<
-- =============================================
-- SECURITY PATCH MIGRATION
-- Fixes critical RLS vulnerabilities exposing answers
-- Adds indexes for scalability
-- =============================================

-- 1. FIX EXAMS RLS VULNERABILITY
-- Drop the dangerous policy that exposes correct_answers to all students
DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON public.exams;

-- Recreate policy to ONLY allow selecting SAFE columns
-- Note: Supabase RLS policies don't easily restrict columns, we use view or just rely on API.
-- However, for RLS we just drop it and force clients to use the secure /api/exams/[id]/questions endpoint!
-- Wait, if we drop it, the Leaderboard query (which joins exams) might fail if it relies on client-side join.
-- Actually, the get_leaderboard RPC uses SECURITY DEFINER, so it bypasses RLS!
-- But let's create a restricted policy just in case the client needs to fetch basic exam info.
DROP POLICY IF EXISTS "View published exam basic info" ON public.exams;
CREATE POLICY "View published exam basic info"
  ON public.exams FOR SELECT
  USING (status = 'published');

-- Wait, the policy above still exposes all columns!
-- To truly secure it, we must revoke SELECT on the sensitive columns from the `authenticated` role.
-- BUT revoking column privileges can be messy. Instead, we remove the RLS policy entirely for `student`,
-- OR we just rely on the fact that we can't easily restrict columns via RLS in PostgREST without a View.
-- So the BEST approach: ONLY Teacher can SELECT exams via Supabase client. Students MUST use the API.

DROP POLICY IF EXISTS "View published exam basic info" ON public.exams;

-- 2. FIX SUBMISSIONS RLS VULNERABILITY
-- Drop the dangerous policy that allows students to view OTHER students' submissions (student_answers)
DROP POLICY IF EXISTS "View leaderboard for published exams" ON public.submissions;

-- 3. ADD MISSING INDEXES FOR SCALABILITY
CREATE INDEX IF NOT EXISTS idx_student_stats_xp ON public.student_stats (xp DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_exam_score ON public.submissions (exam_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_exam_student ON public.submission_audit_log (exam_id, student_id);


-- ========================================================
-- END OF SCHEMA
-- ========================================================
