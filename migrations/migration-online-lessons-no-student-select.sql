-- ============================================================================
-- V3: Students cannot SELECT online_lessons (media URLs) via PostgREST/client.
-- Catalog + playback APIs use service role AFTER entitlement checks.
-- Teachers/admins keep full SELECT + manage policies.
-- Run in Supabase SQL Editor after migration-online-study-rls-entitlement.sql
-- ============================================================================

-- Drop entitled-student SELECT on lessons (was leaking video_url / documents)
DROP POLICY IF EXISTS "online_lessons_select_entitled" ON public.online_lessons;
DROP POLICY IF EXISTS "Allow users to view online_lessons" ON public.online_lessons;

-- Staff-only SELECT
DROP POLICY IF EXISTS "online_lessons_select_staff" ON public.online_lessons;
CREATE POLICY "online_lessons_select_staff"
ON public.online_lessons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
  )
);

-- Keep teacher manage policy (idempotent re-create)
DROP POLICY IF EXISTS "online_lessons_manage_teachers" ON public.online_lessons;
DROP POLICY IF EXISTS "Allow teachers to manage online_lessons" ON public.online_lessons;
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

COMMENT ON POLICY "online_lessons_select_staff" ON public.online_lessons IS
  'V3: only teacher/admin can read lesson rows (incl. media URLs). Students use playback API.';
