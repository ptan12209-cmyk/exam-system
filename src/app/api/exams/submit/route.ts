import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Type definitions
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

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
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse request body
        const body: SubmitRequest = await request.json()
        const { exam_id, mc_answers, tf_answers, sa_answers, session_id, time_spent, cheat_flags } = body

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

        // 4. Calculate MC score (SERVER-SIDE)
        let mcCorrect = 0
        const mcTotal = exam.mc_answers?.length || exam.correct_answers?.length || 0

        if (mc_answers && Array.isArray(mc_answers)) {
            mc_answers.forEach((answer, i) => {
                if (exam.mc_answers && exam.mc_answers[i]) {
                    if (answer === exam.mc_answers[i].answer) mcCorrect++
                } else if (exam.correct_answers && answer === exam.correct_answers[i]) {
                    mcCorrect++
                }
            })
        }

        // 5. Calculate TF score (SERVER-SIDE)
        let tfCorrect = 0
        const tfTotal = exam.tf_answers?.length || 0

        if (exam.tf_answers && tf_answers && Array.isArray(tf_answers)) {
            tf_answers.forEach(studentTf => {
                const correctTf = exam.tf_answers?.find((t: TFAnswer) => t.question === studentTf.question)
                if (correctTf) {
                    let subCorrect = 0
                    if (studentTf.a === correctTf.a) subCorrect++
                    if (studentTf.b === correctTf.b) subCorrect++
                    if (studentTf.c === correctTf.c) subCorrect++
                    if (studentTf.d === correctTf.d) subCorrect++
                    tfCorrect += subCorrect / 4
                }
            })
        }

        // 6. Calculate SA score (SERVER-SIDE)
        let saCorrect = 0
        const saTotal = exam.sa_answers?.length || 0

        if (exam.sa_answers && sa_answers && Array.isArray(sa_answers)) {
            sa_answers.forEach(studentSa => {
                const correctSa = exam.sa_answers?.find((s: SAAnswer) => s.question === studentSa.question)
                if (correctSa) {
                    const correctVal = parseFloat(correctSa.answer.toString().replace(',', '.'))
                    const studentVal = parseFloat(studentSa.answer.replace(',', '.'))

                    // 5% tolerance for numerical answers
                    const tolerance = Math.abs(correctVal) * 0.05
                    if (!isNaN(studentVal) && Math.abs(correctVal - studentVal) <= tolerance) {
                        saCorrect++
                    }
                }
            })
        }

        // 7. Calculate final score
        const totalQuestions = mcTotal + tfTotal + saTotal
        const totalCorrect = mcCorrect + tfCorrect + saCorrect
        const score = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 10 : 0

        // 8. Check session ranking status
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

        // 9. Insert submission (with SERVER-CALCULATED score)
        const { data: submission, error: insertError } = await supabase
            .from('submissions')
            .insert({
                exam_id,
                student_id: user.id,
                student_answers: mc_answers,
                mc_student_answers: mc_answers?.map((a, i) => ({ question: i + 1, answer: a })),
                tf_student_answers: tf_answers,
                sa_student_answers: sa_answers,
                score: Math.round(score * 100) / 100, // Round to 2 decimal places
                correct_count: Math.round(totalCorrect),
                mc_correct: mcCorrect,
                tf_correct: Math.round(tfCorrect),
                sa_correct: saCorrect,
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

        // 10. Update session status
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

        // 11. Update participant status
        await supabase
            .from('exam_participants')
            .update({ status: 'submitted', last_active: new Date().toISOString() })
            .eq('exam_id', exam_id)
            .eq('user_id', user.id)

        // Return result (score is now trustworthy)
        return NextResponse.json({
            success: true,
            submission_id: submission.id,
            score: Math.round(score * 100) / 100,
            correct_count: Math.round(totalCorrect),
            total_questions: totalQuestions,
            details: {
                mc: { correct: mcCorrect, total: mcTotal },
                tf: { correct: Math.round(tfCorrect * 100) / 100, total: tfTotal },
                sa: { correct: saCorrect, total: saTotal }
            }
        })

    } catch (error) {
        console.error('Submit API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
