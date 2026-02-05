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
    phone: string | null
    xp: number
    level: number
    created_at: string
    updated_at: string
}

// =============================================
// EXAM TYPES
// =============================================

export type ExamStatus = 'draft' | 'published' | 'archived'

export interface Exam {
    id: string
    teacher_id: string
    title: string
    description?: string
    duration: number // in minutes
    total_questions: number
    status: ExamStatus
    pdf_url?: string | null

    // Scheduling
    is_scheduled?: boolean
    start_time?: string | null
    end_time?: string | null
    max_attempts?: number

    // Answer keys (server-only, never sent to client)
    correct_answers?: string[]
    mc_answers?: MCAnswer[]
    tf_answers?: TFAnswer[]
    sa_answers?: SAAnswer[]

    created_at: string
    updated_at?: string
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
    exam_id: string
    student_id: string
    score: number
    correct_count: number
    mc_correct?: number
    tf_correct?: number
    sa_correct?: number
    time_spent: number // in seconds
    submitted_at: string
    attempt_number: number
    is_ranked: boolean
    session_id?: string
    cheat_flags?: CheatFlags

    // Student answers
    student_answers?: (string | null)[]
    mc_student_answers?: MCStudentAnswer[]
    tf_student_answers?: TFStudentAnswer[]
    sa_student_answers?: SAStudentAnswer[]
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
    exam_id: string
    user_id: string
    student_name: string
    status: ParticipantStatus
    started_at: string
    last_active: string
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
