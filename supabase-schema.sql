-- =============================================
-- EXAM SYSTEM DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================
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
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- =============================================
-- 2. EXAMS TABLE
-- =============================================
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
create policy "Teachers can create exams"
  on exams for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

create policy "Teachers can update own exams"
  on exams for update
  using (teacher_id = auth.uid());

create policy "Teachers can delete own exams"
  on exams for delete
  using (teacher_id = auth.uid());

create policy "Published exams are viewable by all authenticated users"
  on exams for select
  using (
    status = 'published' or teacher_id = auth.uid()
  );

-- =============================================
-- 3. SUBMISSIONS TABLE
-- =============================================
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

  -- Session tracking
  session_id uuid,
  is_ranked boolean DEFAULT true,
  cheat_flags jsonb DEFAULT '{}',

  -- Detailed answers
  mc_student_answers jsonb DEFAULT '[]',
  tf_student_answers jsonb DEFAULT '[]',
  sa_student_answers jsonb DEFAULT '[]',
  mc_correct integer DEFAULT 0,
  tf_correct integer DEFAULT 0,
  sa_correct integer DEFAULT 0,
  attempt_number integer DEFAULT 1,
  
  -- Unique constraint: one submission per student per exam
  unique(exam_id, student_id)
);

COMMENT ON COLUMN public.submissions.session_id IS 'Optional session ID for ranked exams';
COMMENT ON COLUMN public.submissions.is_ranked IS 'Whether this submission counts for leaderboard';
COMMENT ON COLUMN public.submissions.cheat_flags IS 'Cheat detection data {tab_switches, multi_browser, etc}';

-- Enable RLS
alter table public.submissions enable row level security;

-- Policies
create policy "Students can submit"
  on submissions for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'student'
    )
  );

create policy "Users can view own submissions"
  on submissions for select
  using (student_id = auth.uid());

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
create policy "Teachers can upload PDFs"
  on storage.objects for insert
  with check (
    bucket_id = 'exam-pdfs' and
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

create policy "Anyone can view exam PDFs"
  on storage.objects for select
  using (bucket_id = 'exam-pdfs');

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
