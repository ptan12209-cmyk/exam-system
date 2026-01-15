-- ============================================================================
-- Phase 6: Scheduled Exams & Anti-Cheat System
-- ============================================================================

-- 1. Add scheduling fields to exams table
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS start_time timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_scheduled boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN exams.start_time IS 'Thời gian bắt đầu cho phép làm bài';
COMMENT ON COLUMN exams.end_time IS 'Thời gian kết thúc, sau đó không cho làm bài';
COMMENT ON COLUMN exams.is_scheduled IS 'True nếu đề có giới hạn thời gian mở';

-- ============================================================================
-- 2. Exam Sessions - Theo dõi phiên làm bài
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Session tracking
    session_number integer DEFAULT 1,         -- Phiên thứ mấy
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    
    -- Status
    status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    is_ranked boolean DEFAULT true,           -- Có được tính xếp hạng không
    
    -- Anti-cheat flags
    browser_fingerprint text,                 -- Để detect multi-browser
    tab_switch_count integer DEFAULT 0,       -- Số lần chuyển tab
    visibility_changes integer DEFAULT 0,     -- Số lần ẩn/hiện tab
    multi_browser_detected boolean DEFAULT false,
    
    -- Thời gian thực tế
    time_spent integer DEFAULT 0,             -- Thời gian làm bài (giây)
    last_active_at timestamptz DEFAULT now(),
    
    -- Answers snapshot (để tiếp tục làm bài)
    answers_snapshot jsonb DEFAULT '{}',
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Unique constraint: 1 student có thể có nhiều session cho 1 exam
    UNIQUE(exam_id, student_id, session_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_active ON exam_sessions(exam_id, student_id, status) 
    WHERE status = 'in_progress';

-- ============================================================================
-- 3. Update submissions table
-- ============================================================================

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES exam_sessions(id),
ADD COLUMN IF NOT EXISTS is_ranked boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cheat_flags jsonb DEFAULT '{}';

COMMENT ON COLUMN submissions.is_ranked IS 'False nếu không được tính vào bảng xếp hạng (gian lận hoặc làm lại)';
COMMENT ON COLUMN submissions.cheat_flags IS 'Các cờ gian lận: tab_switches, multi_browser, etc.';

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- Students can view/manage their own sessions
CREATE POLICY "Students can view own sessions"
    ON exam_sessions FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Students can insert own sessions"
    ON exam_sessions FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own sessions"
    ON exam_sessions FOR UPDATE
    TO authenticated
    USING (student_id = auth.uid());

-- Teachers can view sessions for their exams
CREATE POLICY "Teachers can view exam sessions"
    ON exam_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_sessions.exam_id 
            AND exams.teacher_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function: Check if exam is currently open
CREATE OR REPLACE FUNCTION is_exam_open(exam_id_input uuid)
RETURNS boolean AS $$
DECLARE
    exam_record RECORD;
BEGIN
    SELECT is_scheduled, start_time, end_time, status
    INTO exam_record
    FROM exams WHERE id = exam_id_input;
    
    -- Not found or not published
    IF exam_record IS NULL OR exam_record.status != 'published' THEN
        RETURN false;
    END IF;
    
    -- Not scheduled = always open
    IF NOT exam_record.is_scheduled THEN
        RETURN true;
    END IF;
    
    -- Check time window
    IF exam_record.start_time IS NOT NULL AND NOW() < exam_record.start_time THEN
        RETURN false; -- Chưa đến giờ
    END IF;
    
    IF exam_record.end_time IS NOT NULL AND NOW() > exam_record.end_time THEN
        RETURN false; -- Đã hết giờ
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get or create session for student
CREATE OR REPLACE FUNCTION get_or_create_exam_session(
    exam_id_input uuid,
    browser_fp text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    existing_session exam_sessions%ROWTYPE;
    new_session_id uuid;
    session_count integer;
BEGIN
    -- Check for active session
    SELECT * INTO existing_session
    FROM exam_sessions
    WHERE exam_id = exam_id_input 
    AND student_id = auth.uid()
    AND status = 'in_progress'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Return existing if found
    IF existing_session.id IS NOT NULL THEN
        -- Check multi-browser
        IF browser_fp IS NOT NULL 
           AND existing_session.browser_fingerprint IS NOT NULL 
           AND existing_session.browser_fingerprint != browser_fp THEN
            -- Mark as multi-browser detected
            UPDATE exam_sessions 
            SET multi_browser_detected = true, is_ranked = false
            WHERE id = existing_session.id;
        END IF;
        
        RETURN existing_session.id;
    END IF;
    
    -- Count existing sessions
    SELECT COUNT(*) INTO session_count
    FROM exam_sessions
    WHERE exam_id = exam_id_input AND student_id = auth.uid();
    
    -- Create new session
    INSERT INTO exam_sessions (
        exam_id, 
        student_id, 
        session_number,
        browser_fingerprint,
        is_ranked
    ) VALUES (
        exam_id_input,
        auth.uid(),
        session_count + 1,
        browser_fp,
        session_count = 0  -- Chỉ session đầu tiên được ranked
    )
    RETURNING id INTO new_session_id;
    
    RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record tab switch
CREATE OR REPLACE FUNCTION record_tab_switch(session_id_input uuid)
RETURNS void AS $$
BEGIN
    UPDATE exam_sessions
    SET 
        tab_switch_count = tab_switch_count + 1,
        visibility_changes = visibility_changes + 1,
        last_active_at = NOW(),
        -- Auto-invalidate if too many switches (>5)
        is_ranked = CASE 
            WHEN tab_switch_count >= 5 THEN false 
            ELSE is_ranked 
        END
    WHERE id = session_id_input AND student_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Save answer snapshot
CREATE OR REPLACE FUNCTION save_answer_snapshot(
    session_id_input uuid,
    answers jsonb
)
RETURNS void AS $$
BEGIN
    UPDATE exam_sessions
    SET 
        answers_snapshot = answers,
        last_active_at = NOW(),
        time_spent = EXTRACT(EPOCH FROM (NOW() - started_at))::integer
    WHERE id = session_id_input AND student_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
