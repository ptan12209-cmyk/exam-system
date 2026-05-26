-- Migration: Cho phép Giáo viên/Phụ huynh giám sát và cập nhật checklist học tập của học sinh
-- Run this in your Supabase SQL Editor on the dashboard

-- 1. Cho phép giáo viên/phụ huynh xem (SELECT) checklist học tập của tất cả học sinh
DROP POLICY IF EXISTS "Teachers can view study tasks" ON public.study_tasks;
CREATE POLICY "Teachers can view study tasks" ON public.study_tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'parent', 'admin')
        )
    );

-- 2. Cho phép giáo viên/phụ huynh thêm/sửa/xóa (ALL) trên checklist học tập của học sinh
DROP POLICY IF EXISTS "Teachers can manage study tasks" ON public.study_tasks;
CREATE POLICY "Teachers can manage study tasks" ON public.study_tasks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'parent', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'parent', 'admin')
        )
    );
