-- Migration: Gamification System
-- Run this in Supabase SQL Editor

-- Student stats table
CREATE TABLE IF NOT EXISTS public.student_stats (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    streak_days integer DEFAULT 0,
    last_exam_date date,
    exams_completed integer DEFAULT 0,
    perfect_scores integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Badges/Achievements
CREATE TABLE IF NOT EXISTS public.badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    icon text,
    xp_reward integer DEFAULT 0,
    condition_type text, -- 'exams_completed', 'perfect_score', 'streak', 'first_exam'
    condition_value integer DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Student earned badges
CREATE TABLE IF NOT EXISTS public.student_badges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    badge_id uuid REFERENCES badges NOT NULL,
    earned_at timestamptz DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.student_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_stats
CREATE POLICY "Users can view their own stats" ON public.student_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.student_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON public.student_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for badges (public read)
CREATE POLICY "Anyone can view badges" ON public.badges
    FOR SELECT TO authenticated USING (true);

-- RLS Policies for student_badges
CREATE POLICY "Users can view their own badges" ON public.student_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON public.student_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Leaderboard view policy (allow viewing others for leaderboard)
CREATE POLICY "Users can view all stats for leaderboard" ON public.student_stats
    FOR SELECT TO authenticated USING (true);

-- Insert default badges
INSERT INTO public.badges (name, description, icon, xp_reward, condition_type, condition_value) VALUES
    ('Người Mới', 'Hoàn thành bài thi đầu tiên', '🎯', 50, 'first_exam', 1),
    ('Streak 3', '3 ngày làm bài liên tiếp', '🔥', 100, 'streak', 3),
    ('Streak 7', '7 ngày làm bài liên tiếp', '🔥', 200, 'streak', 7),
    ('Perfect', 'Đạt điểm 10 tuyệt đối', '⭐', 150, 'perfect_score', 1),
    ('Chăm Chỉ', 'Hoàn thành 10 bài thi', '📚', 200, 'exams_completed', 10),
    ('Master', 'Hoàn thành 50 bài thi', '🏆', 500, 'exams_completed', 50)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_stats_user_id ON public.student_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_student_stats_xp ON public.student_stats(xp DESC);
CREATE INDEX IF NOT EXISTS idx_student_badges_user_id ON public.student_badges(user_id);
