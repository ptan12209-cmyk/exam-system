-- Migration: Add live_config table for YouTube Live integration
-- Run this in Supabase SQL Editor

-- Create live_config table
CREATE TABLE IF NOT EXISTS live_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT,
    youtube_chat_enabled BOOLEAN DEFAULT true,
    is_live BOOLEAN DEFAULT false,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE live_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
CREATE POLICY "Anyone can read live config"
ON live_config FOR SELECT
TO authenticated, anon
USING (true);

-- Policy: Only teachers can update
CREATE POLICY "Teachers can update live config"
ON live_config FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Policy: Only teachers can insert
CREATE POLICY "Teachers can insert live config"
ON live_config FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
    )
);

-- Insert default row if needed
INSERT INTO live_config (youtube_video_id, youtube_chat_enabled, is_live, title)
SELECT null, true, false, 'Buổi Live Chữa Đề'
WHERE NOT EXISTS (SELECT 1 FROM live_config LIMIT 1);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_config_updated_at ON live_config;
CREATE TRIGGER live_config_updated_at
BEFORE UPDATE ON live_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
