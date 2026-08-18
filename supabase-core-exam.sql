-- ============================================================================
-- EXAMHUB CORE EXAM DATABASE — ONE-SHOT REBUILD
-- Version: 2026-08-16
--
-- WARNING: THIS SCRIPT IS DESTRUCTIVE.
-- It deletes and recreates the complete `public` schema. Supabase Auth users
-- (`auth.users`) and Storage objects are not deleted. Only identities carrying
-- server-controlled issuance metadata stay active; direct sign-ups are disabled.
-- Back up production data before running this file in Supabase SQL Editor.
-- ============================================================================

begin;

drop schema if exists public cascade;
create schema public;

grant all on schema public to postgres;
grant usage on schema public to anon, authenticated, service_role;

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared trigger utilities
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Accounts: no public registration; students are teacher-issued
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student'
    check (role in ('student', 'teacher', 'admin', 'parent')),
  account_status text not null default 'disabled'
    check (account_status in ('active', 'disabled')),
  account_source text not null default 'direct_signup'
    check (account_source in ('teacher', 'system', 'legacy', 'direct_signup')),
  created_by uuid null references public.profiles(id) on delete set null,
  email text,
  full_name text,
  nickname text unique,
  class text,
  grade integer check (grade between 6 and 12),
  class_suffix text,
  phone text,
  avatar_url text,
  bio text,
  discord_id text unique,
  discord_study_channel_id text,
  discord_streak integer not null default 0 check (discord_streak >= 0),
  last_discord_study_date date,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_unique
  on public.profiles (lower(email)) where email is not null;
create index profiles_role_active_idx
  on public.profiles (role, account_status);
create index profiles_created_by_idx
  on public.profiles (created_by) where created_by is not null;
create index profiles_class_idx
  on public.profiles (class) where class is not null;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SQL Editor and service-role server routes may manage protected fields.
  -- A normal signed-in user may only update non-security profile columns.
  if (select auth.uid()) is not null
     and coalesce((select auth.role()), '') <> 'service_role' then
    new.role := old.role;
    new.account_status := old.account_status;
    new.account_source := old.account_source;
    new.created_by := old.created_by;
    new.email := old.email;
    new.email_verified_at := old.email_verified_at;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Direct Supabase sign-ups never become active, regardless of client metadata.
  insert into public.profiles (
    id, role, account_status, account_source, email, full_name
  ) values (
    new.id,
    'student',
    'disabled',
    'direct_signup',
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Preserve Auth identities after rebuilding public. Only server-controlled
-- app_metadata may restore an existing teacher/admin; user_metadata is never
-- trusted for authorization. All other pre-existing users are disabled.
insert into public.profiles (
  id, role, account_status, account_source, email, full_name,
  email_verified_at, created_at, updated_at
)
select
  u.id,
  case
    when u.raw_app_meta_data ->> 'role' in ('student', 'teacher', 'admin', 'parent')
      then u.raw_app_meta_data ->> 'role'
    else 'student'
  end,
  case
    when u.raw_app_meta_data ->> 'role' in ('teacher', 'admin')
      and coalesce(u.raw_app_meta_data ->> 'account_status', 'active') = 'active'
      then 'active'
    when u.raw_app_meta_data ->> 'role' = 'student'
      and u.raw_app_meta_data ->> 'account_source' = 'teacher'
      and coalesce(u.raw_app_meta_data ->> 'account_status', 'active') = 'active'
      then 'active'
    else 'disabled'
  end,
  case
    when u.raw_app_meta_data ->> 'account_source' = 'teacher' then 'teacher'
    when u.raw_app_meta_data ->> 'role' in ('teacher', 'admin') then 'system'
    else 'legacy'
  end,
  lower(u.email),
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  case when u.email_confirmed_at is not null then u.email_confirmed_at else null end,
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do nothing;

-- Bootstrap/recover a teacher from SQL Editor only:
--   select public.promote_auth_user_to_teacher('teacher@example.com');
create or replace function public.promote_auth_user_to_teacher(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user auth.users%rowtype;
begin
  select * into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user.id is null then
    raise exception 'Auth user % does not exist. Create it in Supabase Authentication first.', p_email;
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', 'teacher',
        'account_source', 'system',
        'account_status', 'active'
      ),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'teacher', 'account_source', 'system')
  where id = v_user.id;

  insert into public.profiles (
    id, role, account_status, account_source, email, full_name,
    email_verified_at, created_at, updated_at
  ) values (
    v_user.id, 'teacher', 'active', 'system', lower(v_user.email),
    coalesce(v_user.raw_user_meta_data ->> 'full_name', split_part(v_user.email, '@', 1)),
    coalesce(v_user.email_confirmed_at, now()), coalesce(v_user.created_at, now()), now()
  )
  on conflict (id) do update set
    role = 'teacher',
    account_status = 'active',
    account_source = 'system',
    email = excluded.email,
    email_verified_at = coalesce(public.profiles.email_verified_at, now()),
    updated_at = now();

  return v_user.id;
end;
$$;

revoke all on function public.promote_auth_user_to_teacher(text) from public, anon, authenticated;

create or replace function public.is_active_user(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.account_status = 'active'
  );
$$;

create or replace function public.is_teacher(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.role in ('teacher', 'admin')
  );
$$;

revoke all on function public.is_active_user(uuid) from public;
revoke all on function public.is_teacher(uuid) from public;
grant execute on function public.is_active_user(uuid) to authenticated, service_role;
grant execute on function public.is_teacher(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Teacher ↔ student ownership
-- ─────────────────────────────────────────────────────────────────────────────

create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'teacher'
    check (relationship in ('teacher', 'parent', 'guardian')),
  created_at timestamptz not null default now(),
  constraint parent_student_links_not_self check (parent_id <> student_id),
  constraint parent_student_links_parent_id_student_id_key unique (parent_id, student_id)
);

create index parent_student_links_parent_idx on public.parent_student_links(parent_id);
create index parent_student_links_student_idx on public.parent_student_links(student_id);

create or replace function public.manages_student(
  p_student_id uuid,
  p_manager_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.parent_student_links l
    where l.parent_id = p_manager_id and l.student_id = p_student_id
  );
$$;

revoke all on function public.manages_student(uuid, uuid) from public;
grant execute on function public.manages_student(uuid, uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Exams, three JSON answer formats, sessions and submissions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text,
  subject text not null default 'other',
  exam_type text not null default 'pdf' check (exam_type in ('pdf', 'digital')),
  pdf_url text,
  duration integer not null default 45 check (duration between 1 and 1440),
  total_questions integer not null default 0 check (total_questions between 0 and 1500),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  assigned_to text not null default 'normal' check (assigned_to in ('normal', 'x')),
  target_grade integer check (target_grade between 6 and 12),
  target_classes text[],
  is_advanced boolean not null default false,
  max_attempts integer not null default 1 check (max_attempts between 0 and 100),
  is_scheduled boolean not null default false,
  start_time timestamptz,
  end_time timestamptz,
  score_visibility_mode text not null default 'always'
    check (score_visibility_mode in ('always', 'never', 'threshold')),
  score_visibility_threshold numeric(5,2)
    check (score_visibility_threshold is null or score_visibility_threshold between 0 and 10),
  security_level integer not null default 1 check (security_level between 1 and 3),
  answer_key text,
  correct_answers text[] not null default '{}',
  mc_answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(mc_answers) = 'array'),
  tf_answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tf_answers) = 'array'),
  sa_answers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sa_answers) = 'array'),
  questions jsonb,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  -- Kept as nullable compatibility metadata; online-study tables are intentionally absent.
  chapter_id uuid,
  lesson_id uuid,
  section_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_schedule_window_check check (
    not is_scheduled or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index exams_teacher_created_idx on public.exams(teacher_id, created_at desc);
create index exams_created_by_idx on public.exams(created_by, created_at desc);
create index exams_published_idx on public.exams(created_at desc) where status = 'published';
create index exams_target_idx on public.exams(target_grade, assigned_to) where status = 'published';
create index exams_schedule_idx on public.exams(start_time, end_time) where is_scheduled;

create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

create or replace function public.normalize_exam_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(new.created_by, new.teacher_id);
  return new;
end;
$$;

create trigger exams_normalize_owner
before insert or update on public.exams
for each row execute function public.normalize_exam_owner();

create or replace function public.owns_exam(
  p_exam_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and (e.teacher_id = p_user_id or e.created_by = p_user_id)
  );
$$;

revoke all on function public.owns_exam(uuid, uuid) from public;
grant execute on function public.owns_exam(uuid, uuid) to authenticated, service_role;

create table public.exam_participants (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'moderator')),
  status text not null default 'active'
    check (status in ('joined', 'active', 'taking', 'submitted', 'disconnected', 'left')),
  student_name text,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  started_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  last_active timestamptz not null default now(),
  constraint exam_participants_exam_id_user_id_key unique (exam_id, user_id)
);

create index exam_participants_user_idx on public.exam_participants(user_id, exam_id);
create index exam_participants_exam_status_idx on public.exam_participants(exam_id, status);

create or replace function public.populate_participant_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.student_name is null or trim(new.student_name) = '' then
    select coalesce(p.full_name, 'Học sinh')
      into new.student_name
    from public.profiles p
    where p.id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger exam_participants_populate_name
before insert or update of user_id on public.exam_participants
for each row execute function public.populate_participant_name();

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_number integer not null default 1 check (session_number > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  is_ranked boolean not null default true,
  browser_fingerprint text,
  tab_switch_count integer not null default 0 check (tab_switch_count >= 0),
  visibility_changes integer not null default 0 check (visibility_changes >= 0),
  multi_browser_detected boolean not null default false,
  time_spent integer not null default 0 check (time_spent >= 0),
  last_active_at timestamptz not null default now(),
  answers_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_sessions_exam_student_number_key unique (exam_id, student_id, session_number)
);

create index exam_sessions_student_idx on public.exam_sessions(student_id, created_at desc);
create index exam_sessions_exam_idx on public.exam_sessions(exam_id, created_at desc);
create index exam_sessions_active_idx
  on public.exam_sessions(exam_id, student_id, last_active_at desc)
  where status = 'in_progress';

create trigger exam_sessions_set_updated_at
before update on public.exam_sessions
for each row execute function public.set_updated_at();

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.exam_sessions(id) on delete set null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  student_answers text[] not null default '{}',
  mc_student_answers jsonb not null default '[]'::jsonb,
  tf_student_answers jsonb not null default '[]'::jsonb,
  sa_student_answers jsonb not null default '[]'::jsonb,
  score numeric(7,3) not null default 0 check (score >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  mc_correct integer not null default 0 check (mc_correct >= 0),
  tf_correct integer not null default 0 check (tf_correct >= 0),
  sa_correct integer not null default 0 check (sa_correct >= 0),
  time_spent integer not null default 0 check (time_spent >= 0),
  is_ranked boolean not null default true,
  cheat_flags jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  constraint submissions_exam_student_attempt_key unique (exam_id, student_id, attempt_number)
);

create index submissions_exam_score_idx
  on public.submissions(exam_id, score desc, time_spent asc) where is_ranked;
create index submissions_student_created_idx
  on public.submissions(student_id, submitted_at desc);
create index submissions_session_idx
  on public.submissions(session_id) where session_id is not null;

create table public.submission_audit_log (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index submission_audit_exam_idx
  on public.submission_audit_log(exam_id, created_at desc);
create index submission_audit_student_idx
  on public.submission_audit_log(student_id, created_at desc);
create index submission_audit_submission_idx
  on public.submission_audit_log(submission_id) where submission_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Question bank and digital exams
-- ─────────────────────────────────────────────────────────────────────────────

create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 180),
  subject text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index question_banks_teacher_idx
  on public.question_banks(teacher_id, updated_at desc);
create trigger question_banks_set_updated_at
before update on public.question_banks
for each row execute function public.set_updated_at();

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid references public.question_banks(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null default 'other',
  question_type text not null default 'mc' check (question_type in ('mc', 'tf', 'sa')),
  difficulty integer not null default 1 check (difficulty between 1 and 4),
  content text,
  question_text text,
  options jsonb,
  correct_answer jsonb not null,
  explanation text,
  tags text[] not null default '{}',
  source text,
  is_verified boolean not null default false,
  use_count integer not null default 0 check (use_count >= 0),
  order_index integer not null default 0 check (order_index >= 0),
  -- Optional legacy classification metadata. No online-study tables/FKs exist.
  chapter_id uuid,
  lesson_id uuid,
  section_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_has_content check (
    char_length(trim(coalesce(content, question_text, ''))) > 0
  )
);

create index questions_bank_idx on public.questions(bank_id, order_index) where bank_id is not null;
create index questions_exam_idx on public.questions(exam_id, order_index) where exam_id is not null;
create index questions_teacher_type_idx on public.questions(teacher_id, question_type, difficulty);
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create table public.exam_questions (
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index integer not null check (order_index >= 0),
  primary key (exam_id, question_id),
  constraint exam_questions_exam_order_key unique (exam_id, order_index)
);

create index exam_questions_question_idx on public.exam_questions(question_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Arena (core competitive exam mode)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.arena_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subject text not null default 'other',
  exam_id uuid references public.exams(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration integer not null default 60 check (duration between 1 and 1440),
  questions_per_level integer not null default 10 check (questions_per_level > 0),
  total_questions integer not null default 40 check (total_questions > 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arena_sessions_window_check check (end_time > start_time)
);

create index arena_sessions_status_time_idx on public.arena_sessions(status, start_time, end_time);
create index arena_sessions_creator_idx on public.arena_sessions(created_by, created_at desc);
create index arena_sessions_exam_idx on public.arena_sessions(exam_id) where exam_id is not null;
create trigger arena_sessions_set_updated_at
before update on public.arena_sessions
for each row execute function public.set_updated_at();

create table public.arena_results (
  id uuid primary key default gen_random_uuid(),
  arena_id uuid not null references public.arena_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(7,3) not null default 0 check (score >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  total_questions integer not null check (total_questions > 0),
  time_spent integer not null default 0 check (time_spent >= 0),
  answers jsonb not null default '[]'::jsonb,
  question_ids uuid[] not null default '{}',
  rank integer check (rank is null or rank > 0),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint arena_results_arena_id_student_id_key unique (arena_id, student_id)
);

create index arena_results_rank_idx on public.arena_results(arena_id, score desc, time_spent asc);
create index arena_results_student_idx on public.arena_results(student_id, submitted_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Student management: tasks, focus status, timetables, Discord and face logs
-- ─────────────────────────────────────────────────────────────────────────────

create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  due_date timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  is_completed boolean not null default false,
  completed_at timestamptz,
  estimated_time integer not null default 0 check (estimated_time >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_tasks_student_status_idx on public.study_tasks(student_id, status, created_at desc);
create index study_tasks_due_idx on public.study_tasks(student_id, due_date) where due_date is not null and not is_completed;
create trigger study_tasks_set_updated_at
before update on public.study_tasks
for each row execute function public.set_updated_at();

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'offline'
    check (status in ('focusing', 'resting', 'offline', 'discord_class', 'discord_afk')),
  last_status_change timestamptz not null default now(),
  total_focus_seconds_today integer not null default 0 check (total_focus_seconds_today >= 0),
  discord_duration integer not null default 0 check (discord_duration >= 0),
  discord_deafened boolean not null default false,
  discord_sharing_screen boolean not null default false,
  discord_camera_on boolean not null default false,
  discord_last_active timestamptz,
  active_alert text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_student_id_key unique (student_id)
);

create index study_sessions_status_idx on public.study_sessions(status, updated_at desc);
create trigger study_sessions_set_updated_at
before update on public.study_sessions
for each row execute function public.set_updated_at();

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  class_name text,
  room text,
  note text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  constraint timetable_entries_time_check check (end_time > start_time)
);

create index timetable_teacher_day_idx on public.timetable_entries(teacher_id, day_of_week, start_time);
create index timetable_class_day_idx on public.timetable_entries(class_name, day_of_week, start_time) where class_name is not null;

create table public.student_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  class_name text,
  room text,
  note text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  constraint student_timetable_time_check check (end_time > start_time)
);

create index student_timetable_student_day_idx
  on public.student_timetable_entries(student_id, day_of_week, start_time);
create index student_timetable_assigner_idx
  on public.student_timetable_entries(assigned_by, student_id);

create table public.timetable_study_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  slot_id text not null,
  subject text not null,
  session_date date not null default current_date,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  is_completed boolean not null default false,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint timetable_study_logs_time_check check (end_time > start_time),
  constraint timetable_study_logs_student_slot_date_key unique (student_id, slot_id, session_date)
);

create index timetable_study_logs_student_date_idx
  on public.timetable_study_logs(student_id, session_date desc);

create table public.discord_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  discord_id text not null,
  session_date date not null default current_date,
  joined_at timestamptz not null,
  left_at timestamptz,
  total_active_seconds integer not null default 0 check (total_active_seconds >= 0),
  total_afk_seconds integer not null default 0 check (total_afk_seconds >= 0),
  total_muted_seconds integer not null default 0 check (total_muted_seconds >= 0),
  total_sharing_screen_seconds integer not null default 0 check (total_sharing_screen_seconds >= 0),
  total_camera_seconds integer not null default 0 check (total_camera_seconds >= 0),
  created_at timestamptz not null default now()
);

create index discord_logs_student_date_idx
  on public.discord_attendance_logs(student_id, session_date desc, joined_at desc);

create table public.student_face_registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  face_encoding text not null,
  registered_at timestamptz not null default now()
);

create table public.face_monitor_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  is_present boolean not null default true,
  is_verified boolean not null default false,
  dominant_emotion text,
  confidence real check (confidence is null or confidence between 0 and 1),
  snapshot_path text,
  created_at timestamptz not null default now()
);

create index face_monitor_student_created_idx
  on public.face_monitor_logs(student_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications, feedback, OTP and device binding
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'general',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx on public.notifications(user_id, created_at desc) where not is_read;
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

create table public.system_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'praise', 'other')),
  body text not null check (char_length(body) between 5 and 2000),
  subject_key text,
  lesson_id uuid,
  page_path text,
  status text not null default 'new'
    check (status in ('new', 'seen', 'in_progress', 'done', 'archived')),
  teacher_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index system_feedback_status_created_idx on public.system_feedback(status, created_at desc);
create index system_feedback_user_idx on public.system_feedback(user_id, created_at desc);
create trigger system_feedback_set_updated_at
before update on public.system_feedback
for each row execute function public.set_updated_at();

create table public.email_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_otps_active_idx
  on public.email_otps(user_id, created_at desc) where consumed_at is null;

create table public.user_device_bindings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 16 and 128),
  device_label text,
  user_agent text,
  bound_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index user_device_bindings_device_idx on public.user_device_bindings(device_id);

-- Minimal learning-progress support used by the core dashboard. Reward shops,
-- challenges, titles and achievement APIs remain disabled at the app layer.
create table public.student_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_exam_date date,
  exams_completed integer not null default 0 check (exams_completed >= 0),
  perfect_scores integer not null default 0 check (perfect_scores >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_stats_xp_idx on public.student_stats(xp desc);
create trigger student_stats_set_updated_at
before update on public.student_stats
for each row execute function public.set_updated_at();

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  condition_type text not null
    check (condition_type in ('first_exam', 'exams_completed', 'streak', 'perfect_score')),
  condition_value integer not null default 1 check (condition_value >= 1),
  created_at timestamptz not null default now()
);

create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index student_badges_user_idx on public.student_badges(user_id, earned_at desc);

create table public.daily_logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  login_date date not null default current_date,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  streak_day integer not null default 1 check (streak_day >= 1),
  created_at timestamptz not null default now(),
  unique (user_id, login_date)
);

create index daily_logins_user_date_idx
  on public.daily_logins(user_id, login_date desc);

insert into public.badges (
  name, description, icon, xp_reward, condition_type, condition_value
) values
  ('Người Mới', 'Hoàn thành bài thi đầu tiên', '🎯', 50, 'first_exam', 1),
  ('Streak 3', '3 ngày làm bài liên tiếp', '🔥', 100, 'streak', 3),
  ('Streak 7', '7 ngày làm bài liên tiếp', '🔥', 200, 'streak', 7),
  ('Perfect', 'Đạt điểm 10 tuyệt đối', '⭐', 150, 'perfect_score', 1),
  ('Chăm Chỉ', 'Hoàn thành 10 bài thi', '📚', 200, 'exams_completed', 10),
  ('Master', 'Hoàn thành 50 bài thi', '🏆', 500, 'exams_completed', 50);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.exams enable row level security;
alter table public.exam_participants enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_audit_log enable row level security;
alter table public.question_banks enable row level security;
alter table public.questions enable row level security;
alter table public.exam_questions enable row level security;
alter table public.arena_sessions enable row level security;
alter table public.arena_results enable row level security;
alter table public.study_tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.student_timetable_entries enable row level security;
alter table public.timetable_study_logs enable row level security;
alter table public.discord_attendance_logs enable row level security;
alter table public.student_face_registrations enable row level security;
alter table public.face_monitor_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.system_feedback enable row level security;
alter table public.email_otps enable row level security;
alter table public.user_device_bindings enable row level security;
alter table public.student_stats enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.daily_logins enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.manages_student(id, (select auth.uid()))
  or (role = 'teacher' and public.is_active_user((select auth.uid())))
);

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = (select auth.uid()) and public.is_active_user())
with check (id = (select auth.uid()) and public.is_active_user());

create policy links_select on public.parent_student_links
for select to authenticated
using (parent_id = (select auth.uid()) or student_id = (select auth.uid()));
create policy links_insert on public.parent_student_links
for insert to authenticated
with check (parent_id = (select auth.uid()) and public.is_teacher());
create policy links_delete on public.parent_student_links
for delete to authenticated
using (parent_id = (select auth.uid()) and public.is_teacher());

create policy exams_teacher_select on public.exams
for select to authenticated
using (teacher_id = (select auth.uid()) or created_by = (select auth.uid()));
create policy exams_student_select_published on public.exams
for select to authenticated
using (status = 'published' and public.is_active_user());
create policy exams_teacher_insert on public.exams
for insert to authenticated
with check (
  public.is_teacher()
  and teacher_id = (select auth.uid())
  and created_by = (select auth.uid())
);
create policy exams_teacher_update on public.exams
for update to authenticated
using (public.owns_exam(id))
with check (teacher_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy exams_teacher_delete on public.exams
for delete to authenticated
using (public.owns_exam(id));

create policy participants_select on public.exam_participants
for select to authenticated
using (user_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy participants_join on public.exam_participants
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());
create policy participants_update on public.exam_participants
for update to authenticated
using (user_id = (select auth.uid()) or public.owns_exam(exam_id))
with check (user_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy participants_delete on public.exam_participants
for delete to authenticated
using (user_id = (select auth.uid()) or public.owns_exam(exam_id));

create policy exam_sessions_select on public.exam_sessions
for select to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy exam_sessions_insert on public.exam_sessions
for insert to authenticated
with check (student_id = (select auth.uid()) and public.is_active_user());
create policy exam_sessions_update on public.exam_sessions
for update to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id))
with check (student_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy exam_sessions_delete on public.exam_sessions
for delete to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id));

create policy submissions_select on public.submissions
for select to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_exam(exam_id)
  or (
    is_ranked and exists (
      select 1 from public.exams e where e.id = exam_id and e.status = 'published'
    )
  )
);
create policy submissions_insert on public.submissions
for insert to authenticated
with check (student_id = (select auth.uid()) and public.is_active_user());
create policy submissions_update on public.submissions
for update to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id))
with check (student_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy submissions_delete on public.submissions
for delete to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id));

create policy audit_select on public.submission_audit_log
for select to authenticated
using (student_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy audit_insert on public.submission_audit_log
for insert to authenticated
with check (student_id = (select auth.uid()) or public.owns_exam(exam_id));
create policy audit_delete_teacher on public.submission_audit_log
for delete to authenticated using (public.owns_exam(exam_id));

create policy banks_teacher_all on public.question_banks
for all to authenticated
using (teacher_id = (select auth.uid()) and public.is_teacher())
with check (teacher_id = (select auth.uid()) and public.is_teacher());

create policy questions_teacher_all on public.questions
for all to authenticated
using (teacher_id = (select auth.uid()) and public.is_teacher())
with check (teacher_id = (select auth.uid()) and public.is_teacher());
create policy questions_student_select on public.questions
for select to authenticated
using (
  public.is_active_user()
  and (
    exists (
      select 1
      from public.exams e
      where e.id = public.questions.exam_id and e.status = 'published'
    )
    or exists (
      select 1
      from public.exam_questions eq
      join public.exams e on e.id = eq.exam_id
      where eq.question_id = id and e.status = 'published'
    )
  )
);

create policy exam_questions_select on public.exam_questions
for select to authenticated
using (
  public.owns_exam(exam_id)
  or exists (select 1 from public.exams e where e.id = exam_id and e.status = 'published')
);
create policy exam_questions_teacher_all on public.exam_questions
for all to authenticated
using (public.owns_exam(exam_id))
with check (public.owns_exam(exam_id));

create policy arena_sessions_select on public.arena_sessions
for select to authenticated using (public.is_active_user());
create policy arena_sessions_teacher_insert on public.arena_sessions
for insert to authenticated
with check (created_by = (select auth.uid()) and public.is_teacher());
create policy arena_sessions_teacher_update on public.arena_sessions
for update to authenticated
using (created_by = (select auth.uid()) and public.is_teacher())
with check (created_by = (select auth.uid()) and public.is_teacher());
create policy arena_sessions_teacher_delete on public.arena_sessions
for delete to authenticated
using (created_by = (select auth.uid()) and public.is_teacher());

create policy arena_results_select on public.arena_results
for select to authenticated using (public.is_active_user());
create policy arena_results_insert on public.arena_results
for insert to authenticated
with check (student_id = (select auth.uid()) and public.is_active_user());
create policy arena_results_teacher_delete on public.arena_results
for delete to authenticated
using (
  exists (
    select 1 from public.arena_sessions a
    where a.id = arena_id and a.created_by = (select auth.uid())
  )
);

create policy study_tasks_select on public.study_tasks
for select to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy study_tasks_insert on public.study_tasks
for insert to authenticated
with check (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy study_tasks_update on public.study_tasks
for update to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id))
with check (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy study_tasks_delete on public.study_tasks
for delete to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));

create policy study_sessions_select on public.study_sessions
for select to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy study_sessions_insert on public.study_sessions
for insert to authenticated
with check (student_id = (select auth.uid()) and public.is_active_user());
create policy study_sessions_update on public.study_sessions
for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy timetable_teacher_all on public.timetable_entries
for all to authenticated
using (teacher_id = (select auth.uid()) and public.is_teacher())
with check (teacher_id = (select auth.uid()) and public.is_teacher());
create policy timetable_active_select on public.timetable_entries
for select to authenticated using (public.is_active_user());

create policy student_timetable_select on public.student_timetable_entries
for select to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy student_timetable_insert on public.student_timetable_entries
for insert to authenticated
with check (
  (student_id = (select auth.uid()) and assigned_by = (select auth.uid()))
  or (assigned_by = (select auth.uid()) and public.manages_student(student_id))
);
create policy student_timetable_update on public.student_timetable_entries
for update to authenticated
using (
  student_id = (select auth.uid())
  or (assigned_by = (select auth.uid()) and public.manages_student(student_id))
)
with check (
  (student_id = (select auth.uid()) and assigned_by = (select auth.uid()))
  or (assigned_by = (select auth.uid()) and public.manages_student(student_id))
);
create policy student_timetable_delete on public.student_timetable_entries
for delete to authenticated
using (
  student_id = (select auth.uid())
  or (assigned_by = (select auth.uid()) and public.manages_student(student_id))
);

create policy timetable_logs_select on public.timetable_study_logs
for select to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));
create policy timetable_logs_insert on public.timetable_study_logs
for insert to authenticated
with check (student_id = (select auth.uid()));
create policy timetable_logs_update on public.timetable_study_logs
for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));
create policy timetable_logs_delete on public.timetable_study_logs
for delete to authenticated
using (student_id = (select auth.uid()));

create policy discord_logs_select on public.discord_attendance_logs
for select to authenticated
using (student_id = (select auth.uid()) or public.manages_student(student_id));

create policy face_registration_student_all on public.student_face_registrations
for all to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));
create policy face_registration_teacher_select on public.student_face_registrations
for select to authenticated using (public.manages_student(student_id));

create policy face_logs_student_select on public.face_monitor_logs
for select to authenticated using (student_id = (select auth.uid()));
create policy face_logs_student_insert on public.face_monitor_logs
for insert to authenticated with check (student_id = (select auth.uid()));
create policy face_logs_teacher_select on public.face_monitor_logs
for select to authenticated using (public.manages_student(student_id));

create policy notifications_select on public.notifications
for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications
for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_insert on public.notifications
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or (public.is_teacher() and public.manages_student(user_id))
);
create policy notifications_delete on public.notifications
for delete to authenticated using (user_id = (select auth.uid()));

create policy feedback_insert on public.system_feedback
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());
create policy feedback_select on public.system_feedback
for select to authenticated
using (user_id = (select auth.uid()) or public.is_teacher());
create policy feedback_teacher_update on public.system_feedback
for update to authenticated
using (public.is_teacher()) with check (public.is_teacher());

-- OTP writes and device-binding writes are service-role only.
create policy device_binding_select on public.user_device_bindings
for select to authenticated using (user_id = (select auth.uid()));

create policy student_stats_select on public.student_stats
for select to authenticated
using (
  public.is_active_user()
  and (
    user_id = (select auth.uid())
    or public.manages_student(user_id, (select auth.uid()))
    or exists (
      select 1
      from public.profiles me
      join public.profiles peer on peer.id = student_stats.user_id
      where me.id = (select auth.uid())
        and me.role = 'student'
        and me.account_status = 'active'
        and me.class is not null
        and peer.class = me.class
        and peer.role = 'student'
        and peer.account_status = 'active'
    )
  )
);

create policy student_stats_insert_self on public.student_stats
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());

create policy student_stats_update_self on public.student_stats
for update to authenticated
using (user_id = (select auth.uid()) and public.is_active_user())
with check (user_id = (select auth.uid()) and public.is_active_user());

create policy badges_select on public.badges
for select to authenticated using (public.is_active_user());

create policy student_badges_select on public.student_badges
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.manages_student(user_id, (select auth.uid()))
);

create policy student_badges_insert_self on public.student_badges
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());

create policy daily_logins_select on public.daily_logins
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.manages_student(user_id, (select auth.uid()))
);

create policy daily_logins_insert_self on public.daily_logins
for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_active_user());

-- ─────────────────────────────────────────────────────────────────────────────
-- Safe RPCs used by exam result / listing flows
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_exam_leaderboard(exam_uuid uuid)
returns table (
  student_id uuid,
  student_name text,
  score numeric,
  time_spent integer,
  submitted_at timestamptz,
  rank bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.student_id,
    coalesce(p.full_name, 'Học sinh'),
    s.score,
    s.time_spent,
    s.submitted_at,
    row_number() over (order by s.score desc, s.time_spent asc, s.submitted_at asc)
  from public.submissions s
  join public.profiles p on p.id = s.student_id
  join public.exams e on e.id = s.exam_id
  where s.exam_id = exam_uuid
    and s.is_ranked
    and e.status = 'published'
    and public.is_active_user()
  order by s.score desc, s.time_spent asc, s.submitted_at asc
  limit 100;
$$;

create or replace function public.get_exam_for_student(exam_uuid uuid)
returns table (
  id uuid,
  title text,
  subject text,
  duration integer,
  total_questions integer,
  pdf_url text,
  is_scheduled boolean,
  start_time timestamptz,
  end_time timestamptz,
  max_attempts integer,
  security_level integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.title, e.subject, e.duration, e.total_questions, e.pdf_url,
    e.is_scheduled, e.start_time, e.end_time, e.max_attempts, e.security_level
  from public.exams e
  where e.id = exam_uuid
    and e.status = 'published'
    and public.is_active_user();
$$;

revoke all on function public.get_exam_leaderboard(uuid) from public;
revoke all on function public.get_exam_for_student(uuid) from public;
grant execute on function public.get_exam_leaderboard(uuid) to authenticated;
grant execute on function public.get_exam_for_student(uuid) to authenticated;

-- Notify the managing teacher/guardian after each submission.
create or replace function public.notify_manager_on_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications(user_id, title, message, type, link)
  select
    l.parent_id,
    'Học sinh vừa nộp bài',
    coalesce(p.full_name, 'Học sinh') || ' đã nộp: ' || coalesce(e.title, 'Bài tập'),
    'exam_completed',
    '/teacher/exams/' || new.exam_id::text || '/scores'
  from public.parent_student_links l
  join public.profiles p on p.id = new.student_id
  join public.exams e on e.id = new.exam_id
  where l.student_id = new.student_id;
  return new;
end;
$$;

create trigger submissions_notify_manager
after insert on public.submissions
for each row execute function public.notify_manager_on_submission();

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage buckets and policies
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exam-pdfs', 'exam-pdfs', true, 26214400, array['application/pdf']),
  ('exams', 'exams', true, 26214400, array['application/pdf']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('student-snapshots', 'student-snapshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "core_exam_storage_read" on storage.objects;
drop policy if exists "core_exam_storage_insert" on storage.objects;
drop policy if exists "core_exam_storage_update" on storage.objects;
drop policy if exists "core_exam_storage_delete" on storage.objects;

create policy "core_exam_storage_read" on storage.objects
for select to public
using (bucket_id in ('exam-pdfs', 'exams', 'avatars'));

create policy "core_exam_storage_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('exam-pdfs', 'exams', 'avatars', 'student-snapshots')
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_active_user()
);

create policy "core_exam_storage_update" on storage.objects
for update to authenticated
using (
  bucket_id in ('exam-pdfs', 'exams', 'avatars', 'student-snapshots')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('exam-pdfs', 'exams', 'avatars', 'student-snapshots')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "core_exam_storage_delete" on storage.objects
for delete to authenticated
using (
  bucket_id in ('exam-pdfs', 'exams', 'avatars', 'student-snapshots')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants and realtime
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Sensitive tables remain server-only despite the broad authenticated grant.
revoke all on public.email_otps from authenticated, anon;
revoke insert, update, delete on public.user_device_bindings from authenticated, anon;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'exam_participants',
    'exam_sessions',
    'submissions',
    'study_sessions',
    'notifications',
    'face_monitor_logs'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

commit;

-- AFTER COMMIT
-- 1) Disable "Allow new users to sign up" in Supabase Dashboard → Auth → Settings.
-- 2) If no teacher is active, create an Auth user in Dashboard, then run:
--      select public.promote_auth_user_to_teacher('teacher@example.com');
-- 3) Set SUPABASE_SERVICE_ROLE_KEY in the app environment. Never expose it client-side.
