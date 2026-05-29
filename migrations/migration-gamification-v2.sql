-- =============================================
-- ADVANCED GAMIFICATION: Daily Streak & Achievements
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. DAILY LOGIN TRACKING
-- =============================================
CREATE TABLE IF NOT EXISTS public.daily_logins (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    login_date date NOT NULL DEFAULT CURRENT_DATE,
    xp_earned integer DEFAULT 0,
    streak_day integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, login_date)
);

-- =============================================
-- 2. ACHIEVEMENTS (Thành tựu)
-- =============================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    category text DEFAULT 'general', -- 'study', 'streak', 'score', 'special'
    rarity text DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    xp_reward integer DEFAULT 0,
    condition_type text NOT NULL, -- 'exams_completed', 'streak_days', 'perfect_scores', 'total_xp', 'questions_correct'
    condition_value integer NOT NULL,
    is_hidden boolean DEFAULT false, -- Hidden until unlocked
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. USER ACHIEVEMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    achievement_id uuid REFERENCES public.achievements NOT NULL,
    unlocked_at timestamptz DEFAULT now(),
    is_featured boolean DEFAULT false, -- Show on profile
    UNIQUE(user_id, achievement_id)
);

-- =============================================
-- 4. TITLES (Danh hiệu hiển thị)
-- =============================================
CREATE TABLE IF NOT EXISTS public.titles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    display_text text NOT NULL, -- "🔥 Học sinh chăm chỉ"
    color text DEFAULT '#ffffff',
    unlock_achievement_id uuid REFERENCES public.achievements,
    unlock_xp integer, -- Alternative: unlock by XP
    sort_order integer DEFAULT 0
);

-- Add equipped_title to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS equipped_title_id uuid REFERENCES public.titles;

-- =============================================
-- 5. RLS POLICIES
-- =============================================
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-running migration)
DROP POLICY IF EXISTS "Users can view own logins" ON public.daily_logins;
DROP POLICY IF EXISTS "Users can insert own logins" ON public.daily_logins;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view others achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Anyone can view titles" ON public.titles;

-- Daily logins
CREATE POLICY "Users can view own logins" ON public.daily_logins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logins" ON public.daily_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements - public read
CREATE POLICY "Anyone can view achievements" ON public.achievements
    FOR SELECT TO authenticated USING (true);

-- User achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view others achievements" ON public.user_achievements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert achievements" ON public.user_achievements
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Titles
CREATE POLICY "Anyone can view titles" ON public.titles
    FOR SELECT TO authenticated USING (true);

-- =============================================
-- 6. DAILY CHECK-IN FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.daily_checkin(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_today date := CURRENT_DATE;
    v_yesterday date := CURRENT_DATE - 1;
    v_last_login record;
    v_current_streak integer := 1;
    v_xp_bonus integer := 10;
    v_already_checked boolean := false;
    v_result jsonb;
BEGIN
    -- Check if already logged in today
    SELECT * INTO v_last_login FROM public.daily_logins
    WHERE user_id = p_user_id AND login_date = v_today;
    
    IF FOUND THEN
        v_already_checked := true;
        v_result := jsonb_build_object(
            'success', true,
            'already_checked', true,
            'streak', v_last_login.streak_day,
            'xp_earned', 0
        );
        RETURN v_result;
    END IF;
    
    -- Get yesterday's login to calculate streak
    SELECT * INTO v_last_login FROM public.daily_logins
    WHERE user_id = p_user_id AND login_date = v_yesterday;
    
    IF FOUND THEN
        -- Continue streak
        v_current_streak := v_last_login.streak_day + 1;
        -- Bonus XP for streak (max 50)
        v_xp_bonus := LEAST(10 + (v_current_streak * 2), 50);
    ELSE
        -- Check if there was any login in last 2 days (streak broken)
        v_current_streak := 1;
        v_xp_bonus := 10;
    END IF;
    
    -- Insert today's login
    INSERT INTO public.daily_logins (user_id, login_date, xp_earned, streak_day)
    VALUES (p_user_id, v_today, v_xp_bonus, v_current_streak);
    
    -- Add XP to student_stats
    UPDATE public.student_stats
    SET xp = xp + v_xp_bonus,
        streak_days = v_current_streak,
        last_exam_date = v_today
    WHERE user_id = p_user_id;
    
    -- If no stats record, create one
    IF NOT FOUND THEN
        INSERT INTO public.student_stats (user_id, xp, streak_days, last_exam_date)
        VALUES (p_user_id, v_xp_bonus, v_current_streak, v_today);
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'already_checked', false,
        'streak', v_current_streak,
        'xp_earned', v_xp_bonus,
        'milestone', CASE 
            WHEN v_current_streak IN (7, 14, 30, 50, 100) THEN v_current_streak 
            ELSE null 
        END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. CHECK ACHIEVEMENTS FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_stats record;
    v_achievement record;
    v_unlocked text[] := '{}';
    v_total_xp integer := 0;
BEGIN
    -- Get user stats
    SELECT * INTO v_stats FROM public.student_stats WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('unlocked', '{}', 'xp_earned', 0);
    END IF;
    
    -- Check each achievement
    FOR v_achievement IN 
        SELECT a.* FROM public.achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_achievements ua 
            WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
        )
    LOOP
        DECLARE
            v_should_unlock boolean := false;
        BEGIN
            CASE v_achievement.condition_type
                WHEN 'exams_completed' THEN
                    v_should_unlock := v_stats.exams_completed >= v_achievement.condition_value;
                WHEN 'streak_days' THEN
                    v_should_unlock := v_stats.streak_days >= v_achievement.condition_value;
                WHEN 'perfect_scores' THEN
                    v_should_unlock := v_stats.perfect_scores >= v_achievement.condition_value;
                WHEN 'total_xp' THEN
                    v_should_unlock := v_stats.xp >= v_achievement.condition_value;
                WHEN 'level' THEN
                    v_should_unlock := v_stats.level >= v_achievement.condition_value;
                ELSE
                    v_should_unlock := false;
            END CASE;
            
            IF v_should_unlock THEN
                -- Unlock achievement
                INSERT INTO public.user_achievements (user_id, achievement_id)
                VALUES (p_user_id, v_achievement.id)
                ON CONFLICT DO NOTHING;
                
                -- Add XP reward
                IF v_achievement.xp_reward > 0 THEN
                    UPDATE public.student_stats
                    SET xp = xp + v_achievement.xp_reward
                    WHERE user_id = p_user_id;
                    
                    v_total_xp := v_total_xp + v_achievement.xp_reward;
                END IF;
                
                v_unlocked := array_append(v_unlocked, v_achievement.name);
            END IF;
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'unlocked', v_unlocked,
        'xp_earned', v_total_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_daily_logins_user ON public.daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_date ON public.daily_logins(login_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);

-- =============================================
-- 9. SEED DATA - ACHIEVEMENTS (50+ achievements)
-- =============================================
INSERT INTO public.achievements (code, name, description, icon, category, rarity, xp_reward, condition_type, condition_value, is_hidden, sort_order) VALUES
    -- ===== STUDY ACHIEVEMENTS (Learning milestones) =====
    ('first_exam', 'Bước đầu tiên', 'Hoàn thành bài thi đầu tiên', '🎯', 'study', 'common', 50, 'exams_completed', 1, false, 1),
    ('5_exams', 'Khởi động', 'Hoàn thành 5 bài thi', '📝', 'study', 'common', 75, 'exams_completed', 5, false, 2),
    ('10_exams', 'Siêng năng', 'Hoàn thành 10 bài thi', '📚', 'study', 'common', 100, 'exams_completed', 10, false, 3),
    ('25_exams', 'Chăm học', 'Hoàn thành 25 bài thi', '📖', 'study', 'rare', 200, 'exams_completed', 25, false, 4),
    ('50_exams', 'Học sinh chăm chỉ', 'Hoàn thành 50 bài thi', '🎓', 'study', 'rare', 300, 'exams_completed', 50, false, 5),
    ('100_exams', 'Chiến binh tri thức', 'Hoàn thành 100 bài thi', '⚔️', 'study', 'epic', 500, 'exams_completed', 100, false, 6),
    ('250_exams', 'Học giả', 'Hoàn thành 250 bài thi', '📜', 'study', 'epic', 750, 'exams_completed', 250, false, 7),
    ('500_exams', 'Bậc thầy', 'Hoàn thành 500 bài thi', '🏛️', 'study', 'legendary', 1000, 'exams_completed', 500, false, 8),
    ('1000_exams', 'Huyền thoại sống', 'Hoàn thành 1000 bài thi', '👑', 'study', 'legendary', 2000, 'exams_completed', 1000, true, 9),
    
    -- ===== STREAK ACHIEVEMENTS (Consistency) =====
    ('streak_3', 'Bắt đầu streak', '3 ngày liên tiếp', '✨', 'streak', 'common', 30, 'streak_days', 3, false, 20),
    ('streak_7', 'Kiên trì 1 tuần', '7 ngày liên tiếp', '🔥', 'streak', 'common', 70, 'streak_days', 7, false, 21),
    ('streak_14', 'Siêu kiên trì', '14 ngày liên tiếp', '🔥', 'streak', 'rare', 150, 'streak_days', 14, false, 22),
    ('streak_21', 'Thói quen mới', '21 ngày liên tiếp - Tạo thói quen!', '💪', 'streak', 'rare', 210, 'streak_days', 21, false, 23),
    ('streak_30', 'Thói quen tốt', '30 ngày liên tiếp', '🌟', 'streak', 'epic', 300, 'streak_days', 30, false, 24),
    ('streak_50', 'Kỷ luật vàng', '50 ngày liên tiếp', '⭐', 'streak', 'epic', 500, 'streak_days', 50, false, 25),
    ('streak_100', 'Không thể ngăn cản', '100 ngày liên tiếp', '🏆', 'streak', 'legendary', 1000, 'streak_days', 100, false, 26),
    ('streak_200', 'Siêu nhân', '200 ngày liên tiếp', '👑', 'streak', 'legendary', 2000, 'streak_days', 200, true, 27),
    ('streak_365', 'Trọn năm kiên trì', '365 ngày - Cả năm không nghỉ!', '🎆', 'streak', 'legendary', 5000, 'streak_days', 365, true, 28),
    
    -- ===== SCORE ACHIEVEMENTS (Excellence) =====
    ('first_perfect', 'Hoàn hảo!', 'Đạt điểm 10 đầu tiên', '⭐', 'score', 'common', 100, 'perfect_scores', 1, false, 40),
    ('5_perfect', 'Ngôi sao đang lên', '5 lần điểm 10', '✨', 'score', 'common', 150, 'perfect_scores', 5, false, 41),
    ('10_perfect', 'Xuất sắc', '10 lần điểm 10', '🌟', 'score', 'rare', 200, 'perfect_scores', 10, false, 42),
    ('25_perfect', 'Hoàn hảo chủ nghĩa', '25 lần điểm 10', '💫', 'score', 'rare', 350, 'perfect_scores', 25, false, 43),
    ('50_perfect', 'Thiên tài', '50 lần điểm 10', '💎', 'score', 'epic', 500, 'perfect_scores', 50, false, 44),
    ('100_perfect', 'Hoàn hảo tuyệt đối', '100 lần điểm 10', '👑', 'score', 'legendary', 1000, 'perfect_scores', 100, true, 45),
    
    -- ===== XP ACHIEVEMENTS (Accumulation) =====
    ('xp_500', 'Bắt đầu tích lũy', 'Đạt 500 XP', '💵', 'xp', 'common', 0, 'total_xp', 500, false, 60),
    ('xp_1000', 'Tích lũy', 'Đạt 1,000 XP', '💰', 'xp', 'common', 0, 'total_xp', 1000, false, 61),
    ('xp_2500', 'Tiết kiệm', 'Đạt 2,500 XP', '💳', 'xp', 'common', 0, 'total_xp', 2500, false, 62),
    ('xp_5000', 'Giàu có', 'Đạt 5,000 XP', '💎', 'xp', 'rare', 0, 'total_xp', 5000, false, 63),
    ('xp_10000', 'Triệu phú XP', 'Đạt 10,000 XP', '💴', 'xp', 'epic', 0, 'total_xp', 10000, false, 64),
    ('xp_25000', 'Đại gia', 'Đạt 25,000 XP', '💷', 'xp', 'epic', 0, 'total_xp', 25000, false, 65),
    ('xp_50000', 'Tỷ phú XP', 'Đạt 50,000 XP', '🏛️', 'xp', 'legendary', 0, 'total_xp', 50000, false, 66),
    ('xp_100000', 'Huyền thoại XP', 'Đạt 100,000 XP', '👑', 'xp', 'legendary', 0, 'total_xp', 100000, true, 67),
    
    -- ===== LEVEL ACHIEVEMENTS (Progression) =====
    ('level_3', 'Cấp độ mới', 'Đạt level 3', '🆙', 'level', 'common', 30, 'level', 3, false, 80),
    ('level_5', 'Lên cấp', 'Đạt level 5', '⬆️', 'level', 'common', 50, 'level', 5, false, 81),
    ('level_10', 'Tiến bộ', 'Đạt level 10', '🚀', 'level', 'rare', 100, 'level', 10, false, 82),
    ('level_15', 'Học viên giỏi', 'Đạt level 15', '🌠', 'level', 'rare', 150, 'level', 15, false, 83),
    ('level_20', 'Chuyên gia', 'Đạt level 20', '🎯', 'level', 'epic', 200, 'level', 20, false, 84),
    ('level_25', 'Cao thủ', 'Đạt level 25', '🎖️', 'level', 'epic', 250, 'level', 25, false, 85),
    ('level_30', 'Bậc thầy', 'Đạt level 30', '🏅', 'level', 'epic', 300, 'level', 30, false, 86),
    ('level_40', 'Đại sư', 'Đạt level 40', '🥇', 'level', 'legendary', 400, 'level', 40, false, 87),
    ('level_50', 'Grandmaster', 'Đạt level 50', '🏆', 'level', 'legendary', 500, 'level', 50, false, 88),
    ('level_75', 'Huyền thoại', 'Đạt level 75', '👑', 'level', 'legendary', 750, 'level', 75, true, 89),
    ('level_100', 'Thánh nhân', 'Đạt level 100', '🌟', 'level', 'legendary', 1000, 'level', 100, true, 90),
    
    -- ===== SPECIAL HIDDEN ACHIEVEMENTS =====
    ('early_bird', 'Chim sớm bắt sâu', 'Làm bài thi trước 6h sáng', '🐦', 'special', 'rare', 200, 'exams_completed', 1, true, 100),
    ('night_owl', 'Cú đêm', 'Làm bài thi sau 11h đêm', '🦉', 'special', 'rare', 200, 'exams_completed', 1, true, 101),
    ('speed_demon', 'Nhanh như chớp', 'Hoàn thành bài thi trong 2 phút', '⚡', 'special', 'epic', 300, 'exams_completed', 1, true, 102),
    ('comeback_kid', 'Trở lại mạnh mẽ', 'Đạt điểm 10 sau khi trượt', '🔄', 'special', 'rare', 150, 'exams_completed', 1, true, 103),
    ('perfectionist', 'Người cầu toàn', '5 bài liên tiếp điểm 10', '✨', 'special', 'legendary', 500, 'exams_completed', 1, true, 104)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 10. SEED DATA - TITLES (20+ titles)
-- =============================================
INSERT INTO public.titles (name, display_text, color, unlock_xp, sort_order) VALUES
    -- Basic progression titles
    ('Tân binh', '🌱 Tân binh', '#94a3b8', 0, 1),
    ('Người mới', '👶 Người mới', '#a1a1aa', 100, 2),
    ('Học sinh', '📚 Học sinh', '#60a5fa', 500, 3),
    ('Học sinh ngoan', '📖 Học sinh ngoan', '#38bdf8', 1000, 4),
    ('Học sinh giỏi', '⭐ Học sinh giỏi', '#fbbf24', 2000, 5),
    ('Học sinh xuất sắc', '🌟 Học sinh xuất sắc', '#f59e0b', 3500, 6),
    ('Ngôi sao lớp', '💫 Ngôi sao lớp', '#facc15', 5000, 7),
    ('Á khoa', '🥈 Á khoa', '#d1d5db', 7500, 8),
    ('Thủ khoa', '🥇 Thủ khoa', '#fcd34d', 10000, 9),
    ('Thiên tài nhí', '💎 Thiên tài nhí', '#8b5cf6', 15000, 10),
    ('Thiên tài', '💎 Thiên tài', '#a78bfa', 20000, 11),
    ('Kỳ tài', '🔮 Kỳ tài', '#c084fc', 25000, 12),
    ('Thần đồng', '✨ Thần đồng', '#e879f9', 30000, 13),
    ('Bậc thầy', '🎓 Bậc thầy', '#06b6d4', 40000, 14),
    ('Huyền thoại', '👑 Huyền thoại', '#ef4444', 50000, 15),
    ('Đại huyền thoại', '🏆 Đại huyền thoại', '#f43f5e', 75000, 16),
    ('Grandmaster', '🔱 Grandmaster', '#ec4899', 100000, 17),
    -- Fun titles
    ('Người đam mê', '🔥 Người đam mê', '#f97316', 8000, 20),
    ('Kẻ chinh phục', '⚔️ Kẻ chinh phục', '#dc2626', 12000, 21),
    ('Chiến binh tri thức', '🛡️ Chiến binh tri thức', '#2563eb', 18000, 22),
    ('Siêu học sinh', '🦸 Siêu học sinh', '#7c3aed', 35000, 23),
    ('Thánh học', '😇 Thánh học', '#fbbf24', 60000, 24)
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE! Run this in Supabase SQL Editor
-- =============================================

