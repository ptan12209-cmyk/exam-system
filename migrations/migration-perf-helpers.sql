-- ═══════════════════════════════════════════════════════════════════════════
-- PERF HELPERS (2026-08-22)
-- RPC gọn thay cho 4 query tuần tự của MobileNav trên MỌI trang học sinh:
-- đếm số đề published khớp khối/lớp mà học sinh CHƯA nộp.
-- Idempotent. Không xóa dữ liệu.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.get_unsubmitted_exam_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select nickname, grade, class_suffix
    from public.profiles
    where id = auth.uid()
  )
  select count(*)::int
  from public.exams e
  cross join me
  where e.status = 'published'
    and public.is_active_user()
    and e.assigned_to = case when me.nickname = 'X' then 'x' else 'normal' end
    and (
      me.grade is null
      or e.target_grade is null
      or e.target_grade = me.grade
    )
    and (
      e.target_classes is null
      or cardinality(e.target_classes) = 0
      or exists (
        select 1
        from unnest(e.target_classes) c
        where upper(c) = upper(coalesce(me.class_suffix, ''))
      )
    )
    and not exists (
      select 1 from public.submissions s
      where s.exam_id = e.id and s.student_id = auth.uid()
    );
$$;

revoke all on function public.get_unsubmitted_exam_count() from public, anon;
grant execute on function public.get_unsubmitted_exam_count() to authenticated;

commit;
