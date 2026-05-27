-- SQL Migration: Thiết lập hệ thống nhận diện khuôn mặt và giám sát cảm xúc học tập
-- Chạy script này trong Supabase SQL Editor để cập nhật database

-- 1. Bảng lưu trữ ảnh khuôn mặt mẫu của học sinh (đăng ký gốc)
CREATE TABLE IF NOT EXISTS public.student_face_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    face_encoding TEXT NOT NULL, -- Chuỗi vector biểu diễn khuôn mặt (Face Embedding dạng JSON string)
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng ghi nhận nhật ký phân tích khuôn mặt từ camera realtime
CREATE TABLE IF NOT EXISTS public.face_monitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT true, -- Có mặt ở bàn học không
    is_verified BOOLEAN NOT NULL DEFAULT false, -- Đúng chính chủ em trai không
    dominant_emotion TEXT, -- Cảm xúc chủ đạo (neutral, sad, happy, angry, fear, surprise)
    confidence REAL, -- Độ tin cậy của thuật toán
    snapshot_path TEXT -- Đường dẫn file lưu tạm trên Supabase Storage làm bằng chứng
);

-- Bật Row Level Security (RLS) cho cả hai bảng mới
ALTER TABLE public.student_face_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_monitor_logs ENABLE ROW LEVEL SECURITY;

-- 3. Cấu hình chính sách bảo mật RLS cho student_face_registrations
DROP POLICY IF EXISTS "Students can manage their own face registrations" ON public.student_face_registrations;
CREATE POLICY "Students can manage their own face registrations" ON public.student_face_registrations
    FOR ALL TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view student face registrations" ON public.student_face_registrations;
CREATE POLICY "Teachers can view student face registrations" ON public.student_face_registrations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'parent', 'admin')
        )
    );

-- 4. Cấu hình chính sách bảo mật RLS cho face_monitor_logs
DROP POLICY IF EXISTS "Students can insert their own face logs" ON public.face_monitor_logs;
CREATE POLICY "Students can insert their own face logs" ON public.face_monitor_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can view their own face logs" ON public.face_monitor_logs;
CREATE POLICY "Students can view their own face logs" ON public.face_monitor_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view student face logs" ON public.face_monitor_logs;
CREATE POLICY "Teachers can view student face logs" ON public.face_monitor_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'parent', 'admin')
        )
    );

-- 5. Kích hoạt tính năng Realtime cho bảng face_monitor_logs và student_face_registrations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'face_monitor_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.face_monitor_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'student_face_registrations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_face_registrations;
    END IF;
END $$;

