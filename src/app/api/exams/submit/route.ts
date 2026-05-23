import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { invalidateCache } from '@/lib/cache'

import { calculateScore, TFStudentAnswer, SAStudentAnswer } from '@/services/scoring'

interface SubmitRequest {
    exam_id: string
    mc_answers: (string | null)[]
    tf_answers: TFStudentAnswer[]
    sa_answers: SAStudentAnswer[]
    session_id?: string
    time_spent: number
    cheat_flags?: {
        tab_switches: number
        multi_browser: boolean
    }
    fingerprint?: string // Device fingerprint for anti-cheat
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const clientIP = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 🔒 RATE LIMITING - Check submission rate
        const rateLimitResult = await rateLimiters.submission(user.id)
        if (!rateLimitResult.success) {
            console.warn(`Rate limit exceeded for user ${user.id}, IP: ${clientIP}`)
            return rateLimitResponse(rateLimitResult)
        }

        // Parse request body
        const body: SubmitRequest = await request.json()
        const { exam_id, mc_answers, tf_answers, sa_answers, session_id, time_spent, cheat_flags, fingerprint } = body

        if (!exam_id) {
            return NextResponse.json({ error: 'exam_id is required' }, { status: 400 })
        }

        // 1. Fetch exam with answer keys (server has full access)
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('id, title, duration, total_questions, correct_answers, mc_answers, tf_answers, sa_answers, max_attempts, is_scheduled, start_time, end_time')
            .eq('id', exam_id)
            .eq('status', 'published')
            .single()

        if (examError || !exam) {
            return NextResponse.json({ error: 'Exam not found or not published' }, { status: 404 })
        }

        // 2. Check if exam is within time window (if scheduled)
        if (exam.is_scheduled) {
            const now = new Date()
            if (exam.start_time && new Date(exam.start_time) > now) {
                return NextResponse.json({ error: 'Exam has not started yet' }, { status: 403 })
            }
            if (exam.end_time && new Date(exam.end_time) < now) {
                return NextResponse.json({ error: 'Exam has ended' }, { status: 403 })
            }
        }

        // 🔒 SERVER-SIDE TIMER VALIDATION
        if (session_id) {
            const { data: session } = await supabase
                .from('exam_sessions')
                .select('created_at, started_at')
                .eq('id', session_id)
                .single()

            if (session) {
                const sessionStart = new Date(session.started_at || session.created_at).getTime()
                const now = Date.now()
                const elapsed = now - sessionStart
                // 🐛 FIX BUG-005: Reduced buffer from 60s to 15s to prevent exploitation
                const maxAllowedTime = (exam.duration * 60 * 1000) + (15 * 1000) // duration + 15s buffer for network latency

                if (elapsed > maxAllowedTime) {
                    console.warn(`Timer exceeded for user ${user.id}: elapsed=${elapsed}ms, max=${maxAllowedTime}ms`)
                    // Log to audit
                    await supabase.from('submission_audit_log').insert({
                        exam_id,
                        student_id: user.id,
                        action: 'TIMER_EXCEEDED',
                        details: { elapsed, maxAllowedTime, session_id },
                        ip_address: clientIP,
                        user_agent: userAgent
                    })
                    return NextResponse.json({
                        error: 'Time limit exceeded. Your session has expired.',
                        code: 'TIMER_EXCEEDED'
                    }, { status: 403 })
                }
            }
        }

        // 3. Check attempt count
        const { count: attemptCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('exam_id', exam_id)
            .eq('student_id', user.id)

        const maxAttempts = exam.max_attempts ?? 1
        if (maxAttempts !== 0 && (attemptCount ?? 0) >= maxAttempts) {
            return NextResponse.json({ error: 'Maximum attempts reached' }, { status: 403 })
        }

        // 4. Calculate Score (Centralized Service)
        const scoring = calculateScore(mc_answers, tf_answers, sa_answers, exam)

        // 5. Check session ranking status
        let isRanked = true
        if (session_id) {
            const { data: session } = await supabase
                .from('exam_sessions')
                .select('is_ranked')
                .eq('id', session_id)
                .single()

            if (session) {
                isRanked = session.is_ranked
            }
        }

        // 6. Insert submission (with SERVER-CALCULATED score)
        const { data: submission, error: insertError } = await supabase
            .from('submissions')
            .insert({
                exam_id,
                student_id: user.id,
                student_answers: mc_answers,
                mc_student_answers: mc_answers?.map((a, i) => ({ question: i + 1, answer: a })),
                tf_student_answers: tf_answers,
                sa_student_answers: sa_answers,
                score: scoring.score,
                correct_count: Math.round(scoring.totalCorrect),
                mc_correct: scoring.details.mc.correct,
                tf_correct: Math.round(scoring.details.tf.correct),
                sa_correct: scoring.details.sa.correct,
                submitted_at: new Date().toISOString(),
                time_spent: time_spent || 0,
                attempt_number: (attemptCount ?? 0) + 1,
                session_id,
                is_ranked: isRanked,
                cheat_flags: cheat_flags || { tab_switches: 0, multi_browser: false }
            })
            .select('id')
            .single()

        if (insertError) {
            console.error('Submission insert error:', insertError)
            return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
        }

        // 7. Update session status
        if (session_id) {
            await supabase
                .from('exam_sessions')
                .update({
                    status: 'completed',
                    ended_at: new Date().toISOString(),
                    time_spent: time_spent || 0
                })
                .eq('id', session_id)
        }

        // 8. Update participant status
        await supabase
            .from('exam_participants')
            .update({ status: 'submitted', last_active: new Date().toISOString() })
            .eq('exam_id', exam_id)
            .eq('user_id', user.id)

        // 🔒 9. Log to audit (IP & fingerprint tracking)
        try {
            await supabase.from('submission_audit_log').insert({
                submission_id: submission.id,
                exam_id,
                student_id: user.id,
                action: 'SUBMISSION_SUCCESS',
                details: {
                    score: scoring.score,
                    time_spent,
                    cheat_flags,
                    fingerprint: fingerprint || 'not_provided'
                },
                ip_address: clientIP,
                user_agent: userAgent
            })
        } catch (auditErr) {
            console.warn('Audit log failed:', auditErr)
        }

        // 🚀 Invalidate leaderboard cache for this exam
        await invalidateCache.submission(exam_id)

        // Return result (score is now trustworthy)
        return NextResponse.json({
            success: true,
            submission_id: submission.id,
            score: scoring.score,
            correct_count: Math.round(scoring.totalCorrect),
            total_questions: scoring.totalQuestions,
            details: scoring.details
        })

    } catch (error) {
        console.error('Submit API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
