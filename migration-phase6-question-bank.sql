-- ============================================================================
-- Phase 6 Priority 2: Question Bank & Arena System
-- ============================================================================

-- 1. QUESTIONS TABLE - Ngân hàng câu hỏi
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Classification
    subject text NOT NULL CHECK (subject IN ('math', 'physics', 'chemistry')),
    difficulty integer NOT NULL CHECK (difficulty BETWEEN 1 AND 4),
    -- 1: Dễ, 2: Trung bình, 3: Khó, 4: Rất khó
    
    -- Content (supports KaTeX/LaTeX)
    content text NOT NULL,              -- Nội dung câu hỏi
    options jsonb NOT NULL,             -- ["A. ...", "B. ...", "C. ...", "D. ..."]
    correct_answer text NOT NULL,       -- "A", "B", "C", or "D"
    explanation text,                   -- Giải thích đáp án
    
    -- Metadata
    tags text[] DEFAULT '{}',           -- ["động học", "lực", "nhiệt động"]
    source text,                        -- Nguồn: sách, đề thi, ...
    is_verified boolean DEFAULT false,  -- Đã được kiểm duyệt
    use_count integer DEFAULT 0,        -- Số lần sử dụng
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_subject_difficulty ON questions(subject, difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_teacher ON questions(teacher_id);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view questions"
    ON questions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can insert questions"
    ON questions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own questions"
    ON questions FOR UPDATE
    TO authenticated
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own questions"
    ON questions FOR DELETE
    TO authenticated
    USING (auth.uid() = teacher_id);

-- ============================================================================
-- 2. ARENA SESSIONS TABLE - Các đợt thi đấu trường
-- ============================================================================

CREATE TABLE IF NOT EXISTS arena_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic info
    name text NOT NULL,                 -- "Đợt 1 - Vật Lý Tháng 1"
    description text,
    subject text NOT NULL CHECK (subject IN ('physics', 'chemistry')),
    
    -- Time window
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    duration integer DEFAULT 60,        -- Thời gian làm bài (phút)
    
    -- Configuration
    questions_per_level integer DEFAULT 10,  -- Số câu mỗi mức độ
    total_questions integer DEFAULT 40,      -- Tổng số câu (10×4)
    
    -- Status
    status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
    
    -- Creator
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arena_sessions_subject ON arena_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_status ON arena_sessions(status);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_time ON arena_sessions(start_time, end_time);

-- Enable RLS
ALTER TABLE arena_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view arena sessions"
    ON arena_sessions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teachers can create arena sessions"
    ON arena_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update arena sessions"
    ON arena_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

-- ============================================================================
-- 3. ARENA RESULTS TABLE - Kết quả đấu trường
-- ============================================================================

CREATE TABLE IF NOT EXISTS arena_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    arena_id uuid REFERENCES arena_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Score
    score numeric(5,2) NOT NULL,
    correct_count integer NOT NULL,
    total_questions integer NOT NULL,
    time_spent integer NOT NULL,        -- Thời gian làm (giây)
    
    -- Detailed answers
    answers jsonb NOT NULL,             -- [{question_id, answer, is_correct}, ...]
    question_ids uuid[] NOT NULL,       -- Danh sách câu hỏi đã làm
    
    -- Ranking
    rank integer,                       -- Thứ hạng (cập nhật sau khi đợt kết thúc)
    
    submitted_at timestamptz DEFAULT now(),
    
    -- Unique: mỗi học sinh chỉ làm 1 lần mỗi đợt
    UNIQUE(arena_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_arena_results_arena ON arena_results(arena_id);
CREATE INDEX IF NOT EXISTS idx_arena_results_student ON arena_results(student_id);
CREATE INDEX IF NOT EXISTS idx_arena_results_score ON arena_results(arena_id, score DESC);

-- Enable RLS
ALTER TABLE arena_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Students can view own results"
    ON arena_results FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Anyone can view leaderboard"
    ON arena_results FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Students can submit results"
    ON arena_results FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get random questions for arena by difficulty
CREATE OR REPLACE FUNCTION get_arena_questions(
    p_subject text,
    p_count_per_level integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    content text,
    options jsonb,
    correct_answer text,
    difficulty integer
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked AS (
        SELECT 
            q.id,
            q.content,
            q.options,
            q.correct_answer,
            q.difficulty,
            ROW_NUMBER() OVER (PARTITION BY q.difficulty ORDER BY random()) as rn
        FROM questions q
        WHERE q.subject = p_subject
        AND q.is_verified = true
    )
    SELECT 
        ranked.id,
        ranked.content,
        ranked.options,
        ranked.correct_answer,
        ranked.difficulty
    FROM ranked
    WHERE ranked.rn <= p_count_per_level
    ORDER BY ranked.difficulty, random();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update arena status based on time
CREATE OR REPLACE FUNCTION update_arena_status()
RETURNS void AS $$
BEGIN
    -- Mark as active
    UPDATE arena_sessions
    SET status = 'active'
    WHERE status = 'upcoming'
    AND start_time <= NOW()
    AND end_time > NOW();
    
    -- Mark as ended
    UPDATE arena_sessions
    SET status = 'ended'
    WHERE status = 'active'
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate rankings for ended arena
CREATE OR REPLACE FUNCTION calculate_arena_rankings(p_arena_id uuid)
RETURNS void AS $$
BEGIN
    WITH ranked AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY score DESC, time_spent ASC) as new_rank
        FROM arena_results
        WHERE arena_id = p_arena_id
    )
    UPDATE arena_results ar
    SET rank = r.new_rank
    FROM ranked r
    WHERE ar.id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. SUBJECT LABELS (for reference)
-- ============================================================================
-- math = Toán
-- physics = Vật Lý  
-- chemistry = Hóa Học

-- DIFFICULTY LABELS:
-- 1 = Dễ (Nhận biết)
-- 2 = Trung bình (Thông hiểu)
-- 3 = Khó (Vận dụng)
-- 4 = Rất khó (Vận dụng cao)
