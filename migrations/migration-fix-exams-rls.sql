-- =====================================================
-- MIGRATION: Sửa lỗi Row-Level Security (RLS) bảng exams
-- Hãy chạy toàn bộ file SQL này trong Supabase SQL Editor
-- =====================================================

-- 1. Bật RLS cho bảng exams để đảm bảo an toàn
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 2. Xóa tất cả các policy cũ trên bảng exams để tránh xung đột
DROP POLICY IF EXISTS "Teachers can create exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can update own exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers can delete own exams" ON public.exams;
DROP POLICY IF EXISTS "Published exams are viewable by all authenticated users" ON public.exams;
DROP POLICY IF EXISTS "View published exam basic info" ON public.exams;

-- Xóa các policy mới (để đảm bảo tính chạy lại được - idempotent)
DROP POLICY IF EXISTS "Allow teachers and admins to create exams" ON public.exams;
DROP POLICY IF EXISTS "Allow users to view exams based on role and ownership" ON public.exams;
DROP POLICY IF EXISTS "Allow owners and admins to update own exams" ON public.exams;
DROP POLICY IF EXISTS "Allow owners and admins to delete own exams" ON public.exams;

-- 3. Tạo lại các chính sách RLS cực kỳ đầy đủ và bảo mật:

-- POLICY 3.1: Cho phép Giáo viên (role = 'teacher') và Admin (role = 'admin') được TẠO đề thi mới
CREATE POLICY "Allow teachers and admins to create exams"
  ON public.exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- POLICY 3.2: Cho phép Giáo viên và Admin xem đề thi của CHÍNH MÌNH (bất kể draft hay published)
-- Đồng thời cho phép Học sinh xem các đề thi đã XUẤT BẢN (status = 'published') để làm bài
CREATE POLICY "Allow users to view exams based on role and ownership"
  ON public.exams FOR SELECT
  TO authenticated
  USING (
    -- Giáo viên hoặc Admin được xem đề thi do chính mình tạo (qua teacher_id hoặc created_by)
    teacher_id = auth.uid() OR 
    created_by = auth.uid() OR
    -- Học sinh hoặc bất kỳ ai đã xác thực được xem đề thi đã xuất bản
    status = 'published' OR
    -- Bất kỳ ai là Admin hoặc Giáo viên đều xem được (nếu cần thiết để quản lý chéo)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- POLICY 3.3: Cho phép Giáo viên và Admin được CẬP NHẬT đề thi của chính mình
CREATE POLICY "Allow owners and admins to update own exams"
  ON public.exams FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    teacher_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- POLICY 3.4: Cho phép Giáo viên và Admin được XÓA đề thi của chính mình
CREATE POLICY "Allow owners and admins to delete own exams"
  ON public.exams FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. DIAGNOSTIC QUERIES (CÂU LỆNH KIỂM TRA LỖI NẾU VẪN BỊ)
-- Nếu chạy xong các policy trên mà vẫn lỗi, hãy chạy câu lệnh dưới đây 
-- để kiểm tra xem tài khoản hiện tại của bạn đã được gán quyền 'teacher' chưa:
--
-- SELECT id, email, role, full_name FROM public.profiles WHERE id = auth.uid();
--
-- Nếu kết quả trả về có role là 'student' hoặc trống, bạn sẽ không có quyền tạo đề.
-- Bạn có thể cập nhật tài khoản của mình thành giáo viên bằng câu lệnh:
--
-- UPDATE public.profiles SET role = 'teacher' WHERE id = 'ID_USER_CỦA_BẠN';
-- =====================================================

-- =====================================================
-- 5. SỬA LỖI LƯU BÀI NỘP (FAILED TO SAVE SUBMISSION)
-- Lỗi này xảy ra do trigger tr_notify_parent_on_exam_completion
-- tham chiếu cột NEW.status không tồn tại trong bảng submissions.
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_parent_on_exam_completion()
RETURNS TRIGGER AS $$
DECLARE
    parent_record RECORD;
    v_student_name TEXT;
    v_exam_title  TEXT;
BEGIN
    -- Vì bảng submissions không có cột status nên chúng ta bỏ điều kiện NEW.status = 'completed'
    -- (Bản ghi được chèn vào submissions mặc định là bài thi đã hoàn thành)
    
    -- Lấy tên học sinh
    SELECT full_name INTO v_student_name
    FROM public.profiles
    WHERE id = NEW.student_id;

    -- Lấy tiêu đề bài thi
    SELECT title INTO v_exam_title
    FROM public.exams
    WHERE id = NEW.exam_id;

    -- Gửi thông báo đến toàn bộ Phụ huynh đã liên kết với Học sinh này
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

-- Đăng ký lại Trigger trên bảng submissions
DROP TRIGGER IF EXISTS tr_notify_parent_on_exam_completion ON public.submissions;
CREATE TRIGGER tr_notify_parent_on_exam_completion
    AFTER INSERT ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_parent_on_exam_completion();

-- Đảm bảo RLS bảng submissions hoạt động chính xác (Tránh lỗi RLS cho Giáo viên & Học sinh)
DROP POLICY IF EXISTS "Students can submit" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;

CREATE POLICY "Students can insert own submissions" 
ON public.submissions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
CREATE POLICY "Students can view own submissions" 
ON public.submissions FOR SELECT 
TO authenticated
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view submissions for their exams" ON public.submissions;
CREATE POLICY "Teachers can view submissions for their exams" 
ON public.submissions FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exams 
        WHERE exams.id = submissions.exam_id 
        AND exams.teacher_id = auth.uid()
    )
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
