/**
 * Exam Service
 * Centralized API calls for exam-related operations
 */

import type { SafeExam, SubmitResponse, LeaderboardResponse } from '@/types'

const API_BASE = '/api'

/**
 * Fetch exam questions (safe, no answer keys)
 */
export async function fetchExamQuestions(examId: string): Promise<SafeExam> {
    const response = await fetch(`${API_BASE}/exams/${examId}/questions`)

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch exam')
    }

    return response.json()
}

/**
 * Submit exam answers
 */
export interface SubmitExamParams {
    exam_id: string
    mc_answers: (string | null)[]
    tf_answers: { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }[]
    sa_answers: { question: number; answer: string }[]
    session_id?: string
    time_spent: number
    cheat_flags?: {
        tab_switches: number
        multi_browser: boolean
    }
    fingerprint?: string
}

export async function submitExam(params: SubmitExamParams): Promise<SubmitResponse> {
    const response = await fetch(`${API_BASE}/exams/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit exam')
    }

    return response.json()
}

/**
 * Fetch leaderboard for an exam
 */
export async function fetchLeaderboard(examId: string): Promise<LeaderboardResponse> {
    const response = await fetch(`${API_BASE}/exams/${examId}/leaderboard`)

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch leaderboard')
    }

    return response.json()
}

/**
 * Export exam results
 */
export function getExportUrl(examId: string, format: 'csv' | 'json' = 'csv'): string {
    return `${API_BASE}/exams/${examId}/export?format=${format}`
}

/**
 * Download export file
 */
export async function downloadExport(examId: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
    const url = getExportUrl(examId, format)
    window.open(url, '_blank')
}
