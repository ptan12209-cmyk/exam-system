import { z } from 'zod'

// ── Option constants ──
export const OPTIONS = ['A', 'B', 'C', 'D'] as const
export type Option = (typeof OPTIONS)[number]

// ── Answer types (teacher-defined correct answers) ──
export type MCAnswer = { question: number; answer: string }
export type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
export type SAAnswer = { question: number; answer: number | string }

// ── Student answer types ──
export type TFStudentAnswer = {
    question: number
    a: boolean | null
    b: boolean | null
    c: boolean | null
    d: boolean | null
}
export type SAStudentAnswer = { question: number; answer: string }

// ── Scoring result ──
export interface ScoringResult {
    score: number
    totalCorrect: number
    totalQuestions: number
    details: {
        mc: { correct: number; total: number }
        tf: { correct: number; total: number }
        sa: { correct: number; total: number }
    }
}

// ── Zod schemas (shared across endpoints) ──
export const tfAnswerSchema = z.object({
    question: z.number().int().min(1),
    a: z.boolean().nullable(),
    b: z.boolean().nullable(),
    c: z.boolean().nullable(),
    d: z.boolean().nullable(),
})

export const saAnswerSchema = z.object({
    question: z.number().int().min(1),
    answer: z.string(),
})

export const cheatFlagsSchema = z.object({
    tab_switches: z.number().int().min(0),
    multi_browser: z.boolean(),
})

export type CheatFlags = z.infer<typeof cheatFlagsSchema>

export const submitSchema = z.object({
    exam_id: z.string().uuid(),
    mc_answers: z.array(z.string().length(1).nullable()),
    tf_answers: z.array(tfAnswerSchema),
    sa_answers: z.array(saAnswerSchema),
    session_id: z.string().uuid().optional(),
    time_spent: z.number().min(0),
    cheat_flags: cheatFlagsSchema.optional(),
    fingerprint: z.string().max(256).optional(),
})
