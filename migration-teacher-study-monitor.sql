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

-- 3. Cho phép tất cả người dùng đã xác thực xem (SELECT) thông tin hồ sơ (profiles) của nhau
-- Điều này cực kỳ quan trọng để người anh có thể tìm kiếm em trai qua Email và hiển thị Bảng xếp hạng học tập
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- 4. Tạo cột email, đồng bộ email cũ và cập nhật trigger đăng ký để tự động lưu email vào public.profiles
-- Đảm bảo cột email tồn tại trong public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Đồng bộ toàn bộ email cũ từ auth.users sang public.profiles
UPDATE public.profiles
SET email = (SELECT email FROM auth.users WHERE auth.users.id = public.profiles.id)
WHERE email IS NULL OR email = '';

-- Cập nhật trigger handle_new_user để tự động ghi email vào profiles khi học sinh đăng ký tài khoản mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.email, '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

