-- ============================================================================
-- Migration: Online Study content entitlement RLS + profile role lock
-- Run in Supabase SQL Editor after reviewing
-- ============================================================================

-- Map catalog keys (toan) ↔ folder.subject db keys (math)
CREATE OR REPLACE FUNCTION public.online_subject_matches(grant_subject text, content_subject text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    grant_subject = 'all'
    OR grant_subject = content_subject
    OR (grant_subject, content_subject) IN (
      ('toan', 'math'),
      ('ly', 'physics'),
      ('hoa', 'chemistry'),
      ('van', 'literature'),
      ('su', 'history'),
      ('dia', 'geography'),
      ('ktpl', 'civic_education'),
      ('sinh', 'biology'),
      ('anh', 'english'),
      ('dgnl_hsa', 'dgnl_hsa'),
      ('dgnl_vact', 'dgnl_vact'),
      ('dgnl_tsa', 'dgnl_tsa')
    );
$$;

-- 1. online_folders SELECT: teacher/admin OR entitled student
DROP POLICY IF EXISTS "Allow users to view online_folders" ON public.online_folders;
DROP POLICY IF EXISTS "online_folders_select_entitled" ON public.online_folders;
CREATE POLICY "online_folders_select_entitled"
ON public.online_folders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
  OR EXISTS (
    SELECT 1 FROM public.student_online_subjects s
    WHERE s.student_id = auth.uid()
      AND public.online_subject_matches(s.subject, online_folders.subject)
  )
);

DROP POLICY IF EXISTS "Allow teachers to manage online_folders" ON public.online_folders;
DROP POLICY IF EXISTS "online_folders_manage_teachers" ON public.online_folders;
CREATE POLICY "online_folders_manage_teachers"
ON public.online_folders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

-- 2. online_lessons SELECT via parent folder
DROP POLICY IF EXISTS "Allow users to view online_lessons" ON public.online_lessons;
DROP POLICY IF EXISTS "online_lessons_select_entitled" ON public.online_lessons;
CREATE POLICY "online_lessons_select_entitled"
ON public.online_lessons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.online_folders f
    JOIN public.student_online_subjects s ON s.student_id = auth.uid()
    WHERE f.id = online_lessons.folder_id
      AND public.online_subject_matches(s.subject, f.subject)
  )
);

DROP POLICY IF EXISTS "Allow teachers to manage online_lessons" ON public.online_lessons;
DROP POLICY IF EXISTS "online_lessons_manage_teachers" ON public.online_lessons;
CREATE POLICY "online_lessons_manage_teachers"
ON public.online_lessons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

-- 3. Block self role escalation to teacher/admin
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.id
     AND OLD.role IS DISTINCT FROM NEW.role
     AND NEW.role IN ('teacher', 'admin')
     AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
  THEN
    RAISE EXCEPTION 'Role escalation is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();
