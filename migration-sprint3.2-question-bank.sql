-- ============================================================================
-- SPRINT 3.2: QUESTION BANK & DIGITAL EXAMS MIGRATION
-- ============================================================================

-- 1. Thêm loại đề thi vào bảng exams
-- ============================================================================
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type text DEFAULT 'pdf' CHECK (exam_type IN ('pdf', 'digital'));

-- 2. QUESTION BANKS TABLE - Nhóm câu hỏi / Thư mục
-- ============================================================================
CREATE TABLE IF NOT EXISTS question_banks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    subject text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_banks_teacher ON question_banks(teacher_id);
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;

-- Safely drop old policies if they exist so we can recreate them
DROP POLICY IF EXISTS "Teachers can view own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can insert own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can update own banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can delete own banks" ON question_banks;

CREATE POLICY "Teachers can view own banks"
    ON question_banks FOR SELECT TO authenticated
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own banks"
    ON question_banks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own banks"
    ON question_banks FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own banks"
    ON question_banks FOR DELETE TO authenticated
    USING (auth.uid() = teacher_id);

-- 3. QUESTIONS TABLE - Ngân hàng câu hỏi chi tiết
-- ============================================================================
-- Xoá bảng cũ (nếu có từ Phase 6) để tạo lại với cấu trúc đúng chuẩn hỗ trợ TF, SA
DROP TABLE IF EXISTS questions CASCADE;

CREATE TABLE questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id uuid REFERENCES question_banks(id) ON DELETE CASCADE,
    teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    question_type text NOT NULL CHECK (question_type IN ('mc', 'tf', 'sa')),
    difficulty integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 4),
    
    -- Nội dung
    content text NOT NULL,          -- HTML/LaTeX đề bài
    options jsonb,                  -- Cho MC: ["A...", "B...", "C...", "D..."]
    correct_answer jsonb NOT NULL,  -- MC: "A", SA: "2024", TF: {"a":true,"b":false,"c":true,"d":false}
    explanation text,               -- Giải thích
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_questions_teacher ON questions(teacher_id);
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own questions"
    ON questions FOR SELECT TO authenticated
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own questions"
    ON questions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own questions"
    ON questions FOR UPDATE TO authenticated
    USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own questions"
    ON questions FOR DELETE TO authenticated
    USING (auth.uid() = teacher_id);

-- 4. EXAM_QUESTIONS - Bảng trung gian map câu hỏi vào đề thi Digital
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_questions (
    exam_id uuid REFERENCES exams(id) ON DELETE CASCADE,
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    order_index integer NOT NULL,
    PRIMARY KEY (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view exam questions" ON exam_questions;
DROP POLICY IF EXISTS "Teachers can manage exam questions" ON exam_questions;

-- Cho phép học sinh xem câu hỏi nếu họ được phép xem đề thi
CREATE POLICY "Students can view exam questions"
    ON exam_questions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_questions.exam_id 
            AND e.status = 'published'
        )
    );

CREATE POLICY "Teachers can manage exam questions"
    ON exam_questions FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams e 
            WHERE e.id = exam_questions.exam_id 
            AND e.teacher_id = auth.uid()
        )
    );

-- Vì bảng questions đang bị chặn RLS (chỉ teacher xem được), 
-- Ta cần mở RLS bảng questions cho học sinh khi đang thi:
DROP POLICY IF EXISTS "Students can view questions linked to published exams" ON questions;

CREATE POLICY "Students can view questions linked to published exams"
    ON questions FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exam_questions eq
            JOIN exams e ON e.id = eq.exam_id
            WHERE eq.question_id = questions.id
            AND e.status = 'published'
        )
    );
