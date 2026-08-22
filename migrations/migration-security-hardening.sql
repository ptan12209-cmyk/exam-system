-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING (2026-08-22)
-- Chặn lộ đáp án / tài liệu nội bộ:
--   C1  Học sinh SELECT toàn bộ cột bảng exams (kể cả đáp án)
--   C2  Bảng questions lộ correct_answer + explanation
--   C3  Bucket storage exam-pdfs / exams đang PUBLIC
--   C4/C5 Học sinh tự INSERT/UPDATE/DELETE submissions (sửa điểm, giả mạo)
--   H1  Đọc chéo submission của học sinh khác (bài đang thi)
--   H4  Mọi user đọc profile đầy đủ của mọi giáo viên (PII)
--
-- An toàn để chạy nhiều lần (idempotent). Không xóa dữ liệu.
-- Teacher/admin GIỮ NGUYÊN quyền trên bảng gốc qua RLS owns_exam().
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. EXAMS: bỏ policy select cho học sinh, thay bằng view an toàn
--    (view chỉ chứa cột không nhạy cảm, chỉ dòng status='published')
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists exams_student_select_published on public.exams;

create or replace view public.exams_public as
select
  id,
  title,
  description,
  subject,
  exam_type,
  pdf_url,
  duration,
  total_questions,
  status,
  assigned_to,
  target_grade,
  target_classes,
  is_advanced,
  max_attempts,
  is_scheduled,
  start_time,
  end_time,
  score_visibility_mode,
  score_visibility_threshold,
  security_level,
  chapter_id,
  lesson_id,
  section_id,
  created_at,
  updated_at
from public.exams
where status = 'published'
  and public.is_active_user();

grant select on public.exams_public to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. QUESTIONS: bỏ policy select cho học sinh, thay bằng view không đáp án
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists questions_student_select on public.questions;

create or replace view public.questions_public as
select
  q.id,
  q.bank_id,
  q.exam_id,
  q.subject,
  q.question_type,
  q.difficulty,
  q.content,
  q.question_text,
  q.options,
  q.tags,
  q.order_index,
  q.created_at
from public.questions q
where public.is_active_user()
  and exists (
    select 1
    from public.exams e
    where e.status = 'published'
      and (
        e.id = q.exam_id
        or exists (
          select 1 from public.exam_questions eq
          where eq.question_id = q.id and eq.exam_id = e.id
        )
      )
  );

grant select on public.questions_public to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. SUBMISSIONS:
--    - H1: bỏ mệnh đề "đọc mọi bài nộp ranked của đề published"
--    - C4/C5: chấm dứt ghi trực tiếp từ client (chỉ API server ghi qua
--      service_role). Bảng vẫn SELECT được theo own/owns_exam.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions
for select to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_exam(exam_id)
);

revoke insert, update, delete on public.submissions from authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. PROFILES (H4): bỏ mệnh đề cho phép mọi user active đọc profile
--    của MỌI giáo viên. Giữ lại: chính mình + người mình quản lý.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or public.manages_student(id, (select auth.uid()))
  or (
    public.is_teacher()
    and exists (
      select 1 from public.submissions s
      where s.student_id = id and public.owns_exam(s.exam_id)
    )
  )
);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. RPC: trả đề + đáp án cho học sinh KHI VÀ CHỈ KHI đã có bài nộp
--    (dùng bởi trang kết quả sau khi chấm)
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.get_graded_exam_for_student(exam_uuid uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'subject', e.subject,
    'exam_type', e.exam_type,
    'duration', e.duration,
    'total_questions', e.total_questions,
    'max_attempts', e.max_attempts,
    'score_visibility_mode', e.score_visibility_mode,
    'score_visibility_threshold', e.score_visibility_threshold,
    'correct_answers', e.correct_answers,
    'mc_answers', e.mc_answers,
    'tf_answers', e.tf_answers,
    'sa_answers', e.sa_answers
  )
  from public.exams e
  where e.id = exam_uuid
    and e.status = 'published'
    and public.is_active_user()
    and exists (
      select 1 from public.submissions s
      where s.exam_id = e.id and s.student_id = (select auth.uid())
    );
$$;

revoke all on function public.get_graded_exam_for_student(uuid) from public, anon;
grant execute on function public.get_graded_exam_for_student(uuid) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. STORAGE (C3): exam-pdfs & exams chuyển sang PRIVATE.
--    - Học sinh đọc PDF qua signed URL do API server cấp (sau kiểm tra).
--    - GV/admin vẫn đọc trực tiếp; owner luôn đọc được file của mình.
--    - avatars giữ public (avatar hiển thị công khai).
-- ───────────────────────────────────────────────────────────────────────────

update storage.buckets
set public = false
where id in ('exam-pdfs', 'exams');

drop policy if exists "core_exam_storage_read" on storage.objects;
drop policy if exists "core_exam_storage_read_avatars" on storage.objects;
drop policy if exists "core_exam_storage_read_private" on storage.objects;

create policy "core_exam_storage_read_avatars" on storage.objects
for select to public
using (bucket_id = 'avatars');

create policy "core_exam_storage_read_private" on storage.objects
for select to authenticated
using (
  bucket_id in ('exam-pdfs', 'exams', 'student-snapshots')
  and (
    owner = (select auth.uid())
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.account_status = 'active'
        and p.role in ('teacher', 'admin')
    )
  )
);

-- Upload: teacher upload PDF vào exam buckets ở bất kỳ đường dẫn nào;
-- avatar/snapshot vẫn phải nằm trong thư mục uid của chính chủ.
drop policy if exists "core_exam_storage_insert" on storage.objects;
create policy "core_exam_storage_insert" on storage.objects
for insert to authenticated
with check (
  case
    when bucket_id in ('exam-pdfs', 'exams') then public.is_teacher()
    when bucket_id in ('avatars', 'student-snapshots') then
      (storage.foldername(name))[1] = (select auth.uid())::text
      and public.is_active_user()
    else false
  end
);

commit;

-- Xác minh nhanh sau khi chạy:
--   select * from public.exams_public limit 1;                       -- ok
--   select correct_answers from public.exams limit 1;                -- PHẢI lỗi permission (HS)
--   select * from public.get_graded_exam_for_student('<exam-uuid>'); -- null nếu chưa nộp
