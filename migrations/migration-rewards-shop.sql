-- =============================================
-- GAMIFICATION EXPANSION: Rewards Shop & Challenges
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. REWARDS TABLE (Phần thưởng có thể đổi XP)
-- =============================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    icon text DEFAULT '🎁',
    xp_cost integer NOT NULL CHECK (xp_cost > 0),
    stock integer DEFAULT -1, -- -1 = unlimited
    category text CHECK (category IN ('avatar', 'badge', 'bonus', 'physical')),
    metadata jsonb DEFAULT '{}', -- For avatar URLs, badge data, etc.
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. STUDENT REWARDS (Phần thưởng đã đổi)
-- =============================================
CREATE TABLE IF NOT EXISTS public.student_rewards (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    reward_id uuid REFERENCES public.rewards NOT NULL,
    redeemed_at timestamptz DEFAULT now(),
    status text DEFAULT 'delivered' CHECK (status IN ('pending', 'delivered', 'cancelled')),
    UNIQUE(user_id, reward_id, redeemed_at) -- Allow multiple redemptions of same reward
);

-- =============================================
-- 3. WEEKLY CHALLENGES (Thử thách hàng tuần)
-- =============================================
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    icon text DEFAULT '🏆',
    xp_reward integer DEFAULT 100 CHECK (xp_reward >= 0),
    target_type text NOT NULL CHECK (target_type IN ('exams_count', 'perfect_scores', 'streak', 'total_score')),
    target_value integer NOT NULL DEFAULT 1 CHECK (target_value > 0),
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    CHECK (end_date >= start_date)
);

-- =============================================
-- 4. STUDENT CHALLENGES (Tiến độ thử thách)
-- =============================================
CREATE TABLE IF NOT EXISTS public.student_challenges (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    challenge_id uuid REFERENCES public.weekly_challenges NOT NULL,
    progress integer DEFAULT 0 CHECK (progress >= 0),
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- =============================================
-- 5. ENABLE RLS
-- =============================================
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_challenges ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES - REWARDS
-- =============================================
-- Anyone authenticated can view active rewards
CREATE POLICY "View active rewards" ON public.rewards
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Teachers can manage rewards
CREATE POLICY "Teachers manage rewards" ON public.rewards
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- =============================================
-- 7. RLS POLICIES - STUDENT REWARDS
-- =============================================
-- Users can view their own redeemed rewards
CREATE POLICY "View own rewards" ON public.student_rewards
    FOR SELECT USING (auth.uid() = user_id);

-- Users can redeem rewards (insert)
CREATE POLICY "Redeem rewards" ON public.student_rewards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 8. RLS POLICIES - WEEKLY CHALLENGES
-- =============================================
-- Anyone authenticated can view active challenges
CREATE POLICY "View active challenges" ON public.weekly_challenges
    FOR SELECT TO authenticated
    USING (is_active = true AND end_date >= CURRENT_DATE);

-- Teachers can manage challenges
CREATE POLICY "Teachers manage challenges" ON public.weekly_challenges
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'teacher'
        )
    );

-- =============================================
-- 9. RLS POLICIES - STUDENT CHALLENGES
-- =============================================
-- Users can view their own challenge progress
CREATE POLICY "View own challenge progress" ON public.student_challenges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert/update their own progress
CREATE POLICY "Update own challenge progress" ON public.student_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modify own challenge progress" ON public.student_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to redeem a reward (atomic XP deduction)
CREATE OR REPLACE FUNCTION public.redeem_reward(
    p_user_id uuid,
    p_reward_id uuid
) RETURNS jsonb AS $$
DECLARE
    v_reward public.rewards%ROWTYPE;
    v_user_xp integer;
    v_result jsonb;
BEGIN
    -- Get reward details
    SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward not found or inactive');
    END IF;
    
    -- Check stock
    IF v_reward.stock = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reward out of stock');
    END IF;
    
    -- Get user XP
    SELECT xp INTO v_user_xp FROM public.student_stats WHERE user_id = p_user_id;
    
    IF v_user_xp IS NULL OR v_user_xp < v_reward.xp_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient XP', 'required', v_reward.xp_cost, 'current', COALESCE(v_user_xp, 0));
    END IF;
    
    -- Deduct XP
    UPDATE public.student_stats 
    SET xp = xp - v_reward.xp_cost 
    WHERE user_id = p_user_id;
    
    -- Reduce stock if not unlimited
    IF v_reward.stock > 0 THEN
        UPDATE public.rewards SET stock = stock - 1 WHERE id = p_reward_id;
    END IF;
    
    -- Record redemption
    INSERT INTO public.student_rewards (user_id, reward_id, status)
    VALUES (p_user_id, p_reward_id, 'delivered');
    
    RETURN jsonb_build_object(
        'success', true, 
        'reward_name', v_reward.name,
        'xp_spent', v_reward.xp_cost,
        'remaining_xp', v_user_xp - v_reward.xp_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update challenge progress after exam completion
CREATE OR REPLACE FUNCTION public.update_challenge_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge RECORD;
    v_current_progress integer;
    v_score numeric;
BEGIN
    v_score := NEW.score;
    
    -- Loop through active challenges
    FOR v_challenge IN 
        SELECT * FROM public.weekly_challenges 
        WHERE is_active = true 
        AND CURRENT_DATE BETWEEN start_date AND end_date
    LOOP
        -- Get or create student challenge record
        INSERT INTO public.student_challenges (user_id, challenge_id, progress)
        VALUES (NEW.student_id, v_challenge.id, 0)
        ON CONFLICT (user_id, challenge_id) DO NOTHING;
        
        -- Calculate new progress based on challenge type
        CASE v_challenge.target_type
            WHEN 'exams_count' THEN
                UPDATE public.student_challenges 
                SET progress = progress + 1,
                    completed = (progress + 1 >= v_challenge.target_value),
                    completed_at = CASE WHEN progress + 1 >= v_challenge.target_value THEN now() ELSE NULL END
                WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
                
            WHEN 'perfect_scores' THEN
                IF v_score >= 10 THEN
                    UPDATE public.student_challenges 
                    SET progress = progress + 1,
                        completed = (progress + 1 >= v_challenge.target_value),
                        completed_at = CASE WHEN progress + 1 >= v_challenge.target_value THEN now() ELSE NULL END
                    WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
                END IF;
                
            WHEN 'total_score' THEN
                UPDATE public.student_challenges 
                SET progress = progress + v_score::integer,
                    completed = (progress + v_score::integer >= v_challenge.target_value),
                    completed_at = CASE WHEN progress + v_score::integer >= v_challenge.target_value THEN now() ELSE NULL END
                WHERE user_id = NEW.student_id AND challenge_id = v_challenge.id AND NOT completed;
        END CASE;
        
        -- Award XP if just completed
        IF EXISTS (
            SELECT 1 FROM public.student_challenges 
            WHERE user_id = NEW.student_id 
            AND challenge_id = v_challenge.id 
            AND completed = true 
            AND completed_at = now()
        ) THEN
            UPDATE public.student_stats
            SET xp = xp + v_challenge.xp_reward
            WHERE user_id = NEW.student_id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for challenge progress
DROP TRIGGER IF EXISTS on_submission_update_challenges ON public.submissions;
CREATE TRIGGER on_submission_update_challenges
    AFTER INSERT ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_challenge_progress();

-- =============================================
-- 11. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_rewards_active ON public.rewards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_rewards_user ON public.student_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_dates ON public.weekly_challenges(start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_challenges_user ON public.student_challenges(user_id);

-- =============================================
-- 12. SAMPLE DATA
-- =============================================
-- Sample rewards
INSERT INTO public.rewards (name, description, icon, xp_cost, category, stock) VALUES
    ('Avatar Vàng', 'Khung avatar màu vàng đặc biệt', '👑', 500, 'avatar', -1),
    ('Avatar Bạc', 'Khung avatar màu bạc', '🥈', 200, 'avatar', -1),
    ('Badge VIP', 'Huy hiệu VIP hiển thị bên tên', '⭐', 1000, 'badge', 100),
    ('+50 XP Bonus', 'Cộng thêm 50 XP ngay lập tức', '💎', 100, 'bonus', -1),
    ('Skip 1 câu hỏi', 'Bỏ qua 1 câu trong bài thi tiếp theo', '⏭️', 300, 'bonus', -1)
ON CONFLICT DO NOTHING;

-- Sample weekly challenges (for current week)
INSERT INTO public.weekly_challenges (title, description, icon, xp_reward, target_type, target_value, start_date, end_date) VALUES
    ('Chăm Chỉ', 'Hoàn thành 5 bài thi trong tuần', '📚', 150, 'exams_count', 5, 
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
    ('Hoàn Hảo', 'Đạt 2 điểm 10 trong tuần', '💯', 200, 'perfect_scores', 2,
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date),
    ('Tích Lũy', 'Đạt tổng cộng 30 điểm trong tuần', '📈', 100, 'total_score', 30,
     date_trunc('week', CURRENT_DATE)::date, 
     (date_trunc('week', CURRENT_DATE) + interval '6 days')::date)
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE! Run this migration in Supabase SQL Editor
-- =============================================
