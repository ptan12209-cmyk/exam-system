-- FIX: Database Triggers and Realtime for Submissions
-- Run this in Supabase SQL Editor

-- 1. CLEANUP: Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_submission_created ON public.submissions;
DROP TRIGGER IF EXISTS trigger_update_student_stats ON public.submissions;
DROP FUNCTION IF EXISTS public.handle_submission_stats();

-- 2. HELPER: Ensure increment_xp exists (used by client and useful)
CREATE OR REPLACE FUNCTION public.increment_xp(user_id uuid, amount int)
RETURNS void AS $$
BEGIN
  UPDATE public.student_stats
  SET xp = xp + amount,
      level = floor(sqrt((xp + amount) / 100)) + 1
  WHERE user_id = increment_xp.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCTION: Handle new submission (Update Stats & Check Achievements)
CREATE OR REPLACE FUNCTION public.handle_submission_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_xp_earned integer := 0;
    v_streak integer := 0;
    v_last_exam date;
    v_today date := CURRENT_DATE;
    v_diff_days integer;
    v_user_id uuid;
BEGIN
    v_user_id := NEW.student_id;

    -- A. Calculate XP from Score
    -- Logic matches client: Base 50 + High(>=8) 20 + Perfect(>=10) 50 = Max 120 + 30?
    -- Client: Base 50. If >=10: +100. Else if >=8: +20.
    -- So Perfect = 150. High = 70. Normal = 50.
    IF NEW.score >= 10 THEN
        v_xp_earned := 150;
    ELSIF NEW.score >= 8 THEN
        v_xp_earned := 70;
    ELSE
        v_xp_earned := 50;
    END IF;

    -- B. Calculate Streak
    -- Get current stats (lock row?)
    SELECT streak_days, last_exam_date INTO v_streak, v_last_exam
    FROM public.student_stats
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        -- First time user
        v_streak := 1;
        v_xp_earned := v_xp_earned + 10; -- First streak bonus
    ELSE
        IF v_last_exam IS NULL THEN
             v_streak := 1;
        ELSE
             v_diff_days := v_today - v_last_exam;

             IF v_diff_days = 1 THEN
                -- Consecutive day: Increment streak
                v_streak := v_streak + 1;
                -- Bonus: 10 * streak
                v_xp_earned := v_xp_earned + (10 * v_streak);
             ELSIF v_diff_days > 1 THEN
                -- Streak broken
                v_streak := 1;
                v_xp_earned := v_xp_earned + 10; -- Reset streak
             ELSE
                -- Same day (v_diff_days = 0)
                -- Keep current streak, NO extra streak bonus for same day exams
                v_streak := v_streak;
             END IF;
        END IF;
    END IF;

    -- C. Update student_stats
    INSERT INTO public.student_stats (
        user_id,
        xp,
        level,
        streak_days,
        last_exam_date,
        exams_completed,
        perfect_scores
    )
    VALUES (
        v_user_id,
        v_xp_earned,
        floor(sqrt(v_xp_earned / 100)) + 1,
        v_streak,
        v_today,
        1,
        CASE WHEN NEW.score >= 10 THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        xp = student_stats.xp + v_xp_earned,
        level = floor(sqrt((student_stats.xp + v_xp_earned) / 100)) + 1,
        streak_days = v_streak,
        last_exam_date = v_today,
        exams_completed = student_stats.exams_completed + 1,
        perfect_scores = student_stats.perfect_scores + CASE WHEN NEW.score >= 10 THEN 1 ELSE 0 END;

    -- D. Check V2 Achievements (if function exists)
    -- We assume check_and_unlock_achievements exists from migration-gamification-v2.sql
    PERFORM public.check_and_unlock_achievements(v_user_id);

    -- E. Daily Login (Ensure login tracked for today)
    INSERT INTO public.daily_logins (user_id, login_date, streak_day)
    VALUES (v_user_id, v_today, v_streak)
    ON CONFLICT (user_id, login_date) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER: Attach to submissions
CREATE TRIGGER on_submission_created
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.handle_submission_stats();

-- 5. REALTIME: Ensure submissions are broadcasted
-- (This is needed for the SubmissionFeed to work)
ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;

-- 6. VERIFY
-- Check triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'submissions';
