/**
 * Shared Type Definitions for ExamHub
 * Centralized types used across the application
 */

// =============================================
// USER & AUTH TYPES
// =============================================

export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
    id: string
    email: string
    role: UserRole
}

export interface Profile {
    id: string
    role: UserRole
    full_name: string | null
    avatar_url: string | null
    class: string | null
    grade: number | null
    class_suffix: string | null
    phone: string | null
    xp: number
    level: number
    email?: string | null
    nickname?: string | null
    created_at: string
    updated_at: string
}

// =============================================
// EXAM TYPES
// =============================================

export type ExamStatus = 'draft' | 'published' | 'archived'

export interface Exam {
    id: string
    teacher_id?: string
    title: string
    description?: string
    duration: number // in minutes
    total_questions: number
    status?: ExamStatus | string
    pdf_url?: string | null
    subject?: string

    // Scheduling & assignment
    is_scheduled?: boolean
    start_time?: string | null
    end_time?: string | null
    max_attempts?: number
    attempts_used?: number
    assigned_to?: 'normal' | 'x'
    submission_count?: number
    security_level?: number
    score_visibility_mode?: string
    score_visibility_threshold?: number | null

    // Cascade fields
    chapter_id?: string | null
    lesson_id?: string | null
    section_id?: string | null

    // Answer keys (server-only, never sent to client)
    correct_answers?: string[] | null
    mc_answers?: MCAnswer[] | null
    tf_answers?: TFAnswer[] | null
    sa_answers?: SAAnswer[] | null

    // Question lists (for students)
    mc_questions?: { question: number }[]
    tf_questions?: { question: number }[]
    sa_questions?: { question: number }[]

    created_at?: string
    updated_at?: string
}

export type QuestionType = 'mc' | 'tf' | 'sa'

export interface Question {
    id: string
    question_type?: QuestionType | string
    content?: string // used in DigitalQuestionViewer
    question_text?: string // used in exams and arena
    options?: string[] | null
    correct_answer?: any
    explanation?: string | null
    difficulty?: number
    chapter_id?: string | null
    lesson_id?: string | null
    section_id?: string | null
    study_chapters?: { title: string } | null
    study_lessons?: { title: string } | null
    study_sections?: { title: string } | null
}

export interface QuestionBank {
    id: string
    name: string
    subject: string
    description: string
    created_at: string
}

export interface ExamInBank {
    id: string
    title: string
    subject: string
    description: string | null
    pdf_url: string | null
    answer_key: string | null
    total_questions: number
    created_at: string
    questions?: Array<{ question: string; options: string[]; answer: string }>
    target_grade?: number | null
    chapter_id?: string | null
    lesson_id?: string | null
    section_id?: string | null
    correct_answers?: string[] | null
    mc_answers?: any[] | null
    tf_answers?: any[] | null
    sa_answers?: any[] | null
    max_attempts?: number
    security_level?: number
    score_visibility_mode?: string
    score_visibility_threshold?: number | null
}


export interface MCAnswer {
    question: number
    answer: string // 'A' | 'B' | 'C' | 'D'
}

export interface TFAnswer {
    question: number
    a: boolean
    b: boolean
    c: boolean
    d: boolean
}

export interface SAAnswer {
    question: number
    answer: string | number
}

// Safe exam (for students - no answer keys)
export interface SafeExam {
    id: string
    title: string
    duration: number
    total_questions: number
    pdf_url?: string | null
    is_scheduled?: boolean
    start_time?: string | null
    end_time?: string | null
    max_attempts?: number
    attempts_used?: number
    mc_questions?: { question: number }[]
    tf_questions?: { question: number }[]
    sa_questions?: { question: number }[]
}

// =============================================
// SUBMISSION TYPES
// =============================================

export interface Submission {
    id: string
    exam_id?: string // make it optional
    student_id: string
    score: number
    correct_count?: number // make it optional
    total_questions?: number // added for SubmissionFeed and others
    student_name?: string // added for SubmissionFeed
    mc_correct?: number
    tf_correct?: number
    sa_correct?: number
    time_spent?: number // make it optional (in seconds)
    submitted_at: string
    attempt_number?: number
    is_ranked?: boolean
    session_id?: string
    cheat_flags?: CheatFlags
    
    // Loaded/related models
    exam?: {
        title: string
        subject: string | null
        total_questions: number
    }
    profile?: {
        full_name: string | null
    }
    student?: {
        full_name: string | null
        class: string | null
    }

    // Student answers
    student_answers?: (string | null)[] | null
    mc_student_answers?: MCStudentAnswer[] | null
    tf_student_answers?: TFStudentAnswer[] | null
    sa_student_answers?: SAStudentAnswer[] | null
}

export interface MCStudentAnswer {
    question: number
    answer: string | null
}

export interface TFStudentAnswer {
    question: number
    a: boolean | null
    b: boolean | null
    c: boolean | null
    d: boolean | null
}

export interface SAStudentAnswer {
    question: number
    answer: string
}

export interface CheatFlags {
    tab_switches: number
    multi_browser: boolean
}

// =============================================
// SESSION & PARTICIPANT TYPES
// =============================================

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned'
export type ParticipantStatus = 'active' | 'submitted' | 'disconnected'

export interface ExamSession {
    id: string
    exam_id: string
    student_id: string
    status: SessionStatus
    started_at: string
    ended_at?: string
    time_spent?: number
    is_ranked: boolean
}

export interface ExamParticipant {
    exam_id?: string
    user_id: string
    student_name: string
    status: ParticipantStatus | string
    started_at: string
    last_active: string
    progress?: number
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    code?: string
}

export interface SubmitResponse {
    success: boolean
    submission_id: string
    score: number
    correct_count: number
    total_questions: number
    details: {
        mc: { correct: number; total: number }
        tf: { correct: number; total: number }
        sa: { correct: number; total: number }
    }
}

export interface LeaderboardEntry {
    rank: number
    student_id: string
    student_name: string
    avatar_url: string | null
    score: number
    time_spent: number
    submitted_at: string
}

export interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[]
    cached: boolean
    cache_ttl: number
}

// =============================================
// GAMIFICATION TYPES
// =============================================

export interface Achievement {
    id: string
    name: string
    description: string
    icon: string
    category: string
    xp_reward: number
    requirement_type: string
    requirement_value: number
}

export interface UserAchievement {
    id: string
    user_id: string
    achievement_id: string
    unlocked_at: string
    achievement?: Achievement
}

export interface Title {
    id: string
    name: string
    description: string
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    requirement_type: string
    requirement_value: number
}

// =============================================
// UTILITY TYPES
// =============================================

export type SortOrder = 'asc' | 'desc'

export interface PaginationParams {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: SortOrder
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}

// =============================================
// IELTS TYPES
// =============================================

export type IeltsSkill = 'reading' | 'listening' | 'writing'
export type IeltsTestStatus = 'draft' | 'published' | 'archived'
export type IeltsQuestionType = 
  | 'multiple_choice' 
  | 'true_false_ng' 
  | 'yes_no_ng'
  | 'fill_blank' 
  | 'matching' 
  | 'short_answer'
  | 'sentence_completion' 
  | 'diagram_label' 
  | 'heading_match'
export type IeltsWritingTaskType = 'task1' | 'task2'
export type IeltsSubmissionStatus = 'in_progress' | 'submitted' | 'graded'

export interface IeltsTest {
    id: string
    title: string
    description?: string | null
    skill: IeltsSkill
    timer_mode: 'standard' | 'custom'
    duration: number
    total_questions: number
    status: IeltsTestStatus
    created_by?: string | null
    created_at: string
    updated_at: string
    
    // Optional loaded relations
    sections?: IeltsSection[]
}

export interface IeltsSection {
    id: string
    test_id: string
    title: string
    order_index: number
    
    // Reading
    passage_content?: string | null
    
    // Listening
    audio_url?: string | null
    audio_source?: 'upload' | 'youtube' | 'external' | null
    
    // Writing
    writing_prompt?: string | null
    writing_task_type?: IeltsWritingTaskType | null
    writing_image_url?: string | null
    min_words?: number | null
    
    created_at: string
    
    // Optional loaded relations
    questions?: IeltsQuestion[]
}

export interface IeltsQuestion {
    id: string
    section_id: string
    question_number: number
    question_type: IeltsQuestionType
    question_text: string
    options?: any | null // JSON type representing options
    correct_answer: string
    explanation?: string | null
    created_at: string
}

export interface IeltsSubmission {
    id: string
    test_id: string
    student_id: string
    answers: Array<{ question_id: string; answer: string }>
    writing_response?: string | null
    score?: number | null
    correct_count: number
    total_questions: number
    band_score?: number | null
    time_spent: number
    started_at: string
    submitted_at?: string | null
    status: IeltsSubmissionStatus
    created_at: string
    
    // Optional loaded relations
    test?: IeltsTest
    ielts_tests?: IeltsTest | null
    writing_score?: IeltsWritingScore | null
}

export interface IeltsWritingScore {
    id: string
    submission_id: string
    task_achievement: number
    coherence_cohesion: number
    lexical_resource: number
    grammar_accuracy: number
    overall_band: number
    feedback_task?: string | null
    feedback_coherence?: string | null
    feedback_lexical?: string | null
    feedback_grammar?: string | null
    feedback_overall?: string | null
    sample_answer?: string | null
    ai_model: string
    graded_at: string
}

// Kết quả nộp bài trả về từ API /api/ielts/submit
export interface IeltsSubmitResult {
  submission_id: string
  status: IeltsSubmissionStatus
  correct_count: number
  total_questions: number
  band_score: number | null
  score: number | null
}

// Lịch sử làm bài trả về từ API /api/ielts/history (đã flatten)
export interface IeltsHistoryItem {
  id: string
  test_id: string
  test_title: string
  skill: IeltsSkill
  duration: number
  score: number | null
  correct_count: number
  total_questions: number
  band_score: number | null
  time_spent: number
  started_at: string
  submitted_at: string
  status: IeltsSubmissionStatus
}

// Kết quả chấm Writing AI trả về từ API /api/ielts/grade-writing
export interface IeltsGradeWritingResult {
  submission_id: string
  overall_band: number
  scores: {
    task_achievement: number
    coherence_cohesion: number
    lexical_resource: number
    grammar_accuracy: number
  }
  feedback: {
    task: string
    coherence: string
    lexical: string
    grammar: string
    overall: string
  }
  sample_answer: string
}

// Dữ liệu đầu vào khi tạo/cập nhật Section
export interface IeltsSectionInput {
  test_id?: string
  title: string
  order_index?: number
  passage_content?: string
  audio_url?: string
  audio_source?: 'upload' | 'youtube' | 'external'
  writing_prompt?: string
  writing_task_type?: 'task1' | 'task2'
  writing_image_url?: string
  min_words?: number
}

// Dữ liệu đầu vào khi tạo/cập nhật Question
export interface IeltsQuestionInput {
  section_id: string
  question_number: number
  question_type: IeltsQuestionType
  question_text: string
  options?: any // JSON structure tùy theo question_type — giữ any vì schema linh hoạt
  correct_answer: string
  explanation?: string
}

// =============================================
// STUDY & MONITOR TYPES
// =============================================

export interface StudentProfile {
    id: string
    full_name: string | null
    email: string | null
    class: string | null
}

export type StudySessionStatus = 'focusing' | 'resting' | 'offline' | 'discord_class' | 'discord_afk'

export interface StudySession {
    student_id: string
    status: StudySessionStatus
    last_status_change: string
    total_focus_seconds_today: number
    discord_duration?: number
    discord_deafened?: boolean
    discord_last_active?: string
}

export interface StudyTask {
    id: string
    title: string
    description?: string | null
    subject: string | null
    due_date: string | null
    is_completed: boolean
    completed_at?: string | null
    priority: 'low' | 'medium' | 'high'
    status?: 'todo' | 'in_progress' | 'review' | 'done'
    created_at?: string
    estimated_time?: number
}

export interface TeacherProfile {
    id: string
    full_name: string | null
    email: string | null
    role: string
}

export interface DiscordLog {
    id: string
    session_date: string
    joined_at: string
    left_at: string | null
    total_active_seconds: number
    total_afk_seconds: number
}

export interface StudentTimetableEntry {
    id: string
    student_id: string
    assigned_by: string
    day_of_week: number
    start_time: string
    end_time: string
    subject: string
    class_name: string | null
    room: string | null
    note: string | null
    color: string
}

// =============================================
// ARENA TYPES
// =============================================

export interface ArenaSession {
    id: string
    name: string
    subject: string
    duration: number
    description?: string | null
    total_questions?: number
    start_time?: string
    end_time?: string
    exam_id?: string | null
    created_at?: string
    status?: string
    participant_count?: number
    exam?: {
        id: string
        title: string
        subject: string
        total_questions: number
    } | null
}

export interface AnswerDetail {
    question_id: string
    answer: string | null
    correct_answer: string
    is_correct: boolean
}

export interface ArenaResult {
    id: string
    arena_id?: string
    score: number
    correct_count?: number
    total_questions?: number
    time_spent: number
    answers?: AnswerDetail[]
    student_id: string
    rank?: number | null
    created_at?: string
    profiles?: {
        full_name: string | null
    }
    arena_sessions?: {
        name: string
        subject: string
        start_time: string
        end_time: string
    }
}



