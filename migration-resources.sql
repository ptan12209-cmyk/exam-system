-- ============================================================================
-- Migration: Resources Table (Kho Tài Liệu & Đề)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    type text NOT NULL CHECK (type IN ('document', 'exam')),
    subject text CHECK (subject IN ('math', 'physics', 'chemistry', 'english', 'literature', 'biology', 'history', 'geography', 'other')),
    file_url text NOT NULL,
    thumbnail_url text,
    description text,
    tags text[] DEFAULT '{}',
    uploader_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    download_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_uploader ON resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC);

-- 3. Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Everyone can read resources (public library)
CREATE POLICY "Anyone can view resources"
    ON resources FOR SELECT
    USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can upload resources"
    ON resources FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = uploader_id);

-- Uploaders can update their own resources
CREATE POLICY "Uploaders can update own resources"
    ON resources FOR UPDATE
    TO authenticated
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

-- Uploaders can delete their own resources
CREATE POLICY "Uploaders can delete own resources"
    ON resources FOR DELETE
    TO authenticated
    USING (auth.uid() = uploader_id);

-- 5. Function to increment view count
CREATE OR REPLACE FUNCTION increment_resource_view(resource_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE resources 
    SET view_count = view_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to increment download count
CREATE OR REPLACE FUNCTION increment_resource_download(resource_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE resources 
    SET download_count = download_count + 1
    WHERE id = resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Insert sample data (optional)
-- INSERT INTO resources (title, type, subject, file_url, description, tags) VALUES
-- ('Đề thi thử THPT 2026 - Lần 1', 'exam', 'math', 'https://example.com/de1.pdf', 'Đề chuẩn cấu trúc mới BGD', ARRAY['THPT 2026', 'đại số', 'hình học']),
-- ('Tóm tắt công thức Toán 12', 'document', 'math', 'https://example.com/congthuc.pdf', 'Tổng hợp công thức cần nhớ', ARRAY['công thức', 'ôn thi']);

-- ============================================================================
-- Storage bucket for resources (run separately if needed)
-- ============================================================================
-- In Supabase Dashboard > Storage > Create new bucket:
-- Name: resources
-- Public: Yes (for easy access)
-- File size limit: 20MB

-- ============================================================================
-- Live Schedule Table (Lịch live stream)
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_schedule (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    day text NOT NULL,           -- 'Thứ 7', 'Chủ nhật'
    time text NOT NULL,          -- '20:00 - 22:00'
    topic text NOT NULL,         -- 'Chữa đề Toán THPT 2026'
    host text,                   -- 'Thầy Ái'
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE live_schedule ENABLE ROW LEVEL SECURITY;

-- Everyone can view schedule
CREATE POLICY "Anyone can view schedule"
    ON live_schedule FOR SELECT
    USING (true);

-- Only authenticated users can manage
CREATE POLICY "Authenticated users can insert schedule"
    ON live_schedule FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedule"
    ON live_schedule FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete schedule"
    ON live_schedule FOR DELETE
    TO authenticated
    USING (true);

-- Insert default schedule
INSERT INTO live_schedule (day, time, topic, host, sort_order) VALUES
    ('Thứ 7', '20:00 - 22:00', 'Chữa đề Toán THPT 2026', 'Thầy Ái', 1),
    ('Chủ nhật', '19:00 - 21:00', 'Giải đề Vật Lý', 'Thầy Minh', 2)
ON CONFLICT DO NOTHING;
