import { SupabaseClient } from '@supabase/supabase-js'
import { cache as globalCache } from '@/lib/cache'
import {
    validateExamAccess,
    validateSchedule,
    validateAttempts,
    validateTimer,
    buildSubmissionPayload,
    saveSubmission,
    invalidateExamCaches,
} from '@/services/exam-submission'
import { calculateScore } from '@/services/scoring'
import { createServiceContext } from '@/lib/service-context'
import { updateStudentStats } from '@/lib/gamification'

export class SubmissionServerService {
    constructor(private supabase: SupabaseClient) {}

    async processSubmission(input: {
        userId: string
        examId: string
        mc_answers: (string | null)[]
        tf_answers: any[]
        sa_answers: any[]
        session_id?: string
        time_spent: number
        cheat_flags?: any
        fingerprint?: string
        clientIP: string
        userAgent: string
    }) {
        const { userId, examId, mc_answers, tf_answers, sa_answers, session_id, time_spent, cheat_flags, fingerprint, clientIP, userAgent } = input

        // 1. Validate exam access
        const { exam } = await validateExamAccess(this.supabase, userId, examId)

        // 2. Validate schedule
        validateSchedule(exam, new Date())

        // 3. Validate attempt count
        const attemptCount = await validateAttempts(this.supabase, userId, examId, exam.max_attempts ?? 1)

        // 4. Validate timer and get ranking status
        let isRanked = true
        if (session_id) {
            const sessionData = await validateTimer(this.supabase, session_id, exam.duration, userId, clientIP, userAgent, examId)
            isRanked = sessionData.is_ranked
        }

        // 5. Calculate score
        const scoring = calculateScore(mc_answers, tf_answers, sa_answers, exam)

        // 6. Build submission payload
        const submissionPayload = buildSubmissionPayload({
            exam_id: examId,
            userId,
            mc_answers,
            tf_answers,
            sa_answers,
            time_spent,
            session_id,
            cheat_flags,
            fingerprint,
            scoring,
            attemptCount,
            isRanked,
        })

        // 7. Save submission
        const submission = await saveSubmission(
            this.supabase,
            submissionPayload,
            session_id,
            time_spent,
            examId,
            userId,
            clientIP,
            userAgent,
            cheat_flags,
            fingerprint,
        )

        // 8. Invalidate caches
        await invalidateExamCaches(examId)

        // 9. Fire-and-forget gamification update
        try {
            const svcCtx = createServiceContext(this.supabase, globalCache)
            updateStudentStats(userId, scoring.score, svcCtx).catch((e: any) => {
                console.error('Gamification update failed:', e)
            })
        } catch (_) { /* synchronous errors only */ }

        return {
            submission_id: submission.id,
            score: scoring.score,
            correct_count: Math.round(scoring.totalCorrect),
            total_questions: scoring.totalQuestions,
            details: scoring.details,
        }
    }
}