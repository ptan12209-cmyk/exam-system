import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const examId = resolvedParams.id
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch exam (server has full access, but we'll filter the response)
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select(`
                id, title, duration, total_questions, pdf_url, status,
                is_scheduled, start_time, end_time, max_attempts,
                mc_answers, tf_answers, sa_answers, correct_answers
            `)
            .eq('id', examId)
            .eq('status', 'published')
            .single()

        if (examError || !exam) {
            return NextResponse.json({ error: 'Exam not found or not published' }, { status: 404 })
        }

        // Check if exam is within time window (if scheduled)
        if (exam.is_scheduled) {
            const now = new Date()
            if (exam.start_time && new Date(exam.start_time) > now) {
                return NextResponse.json({
                    error: 'Exam has not started yet',
                    start_time: exam.start_time
                }, { status: 403 })
            }
            if (exam.end_time && new Date(exam.end_time) < now) {
                return NextResponse.json({ error: 'Exam has ended' }, { status: 403 })
            }
        }

        // Check attempt count
        const { count: attemptCount } = await supabase
            .from('submissions')
            .select('id', { count: 'exact', head: true })
            .eq('exam_id', examId)
            .eq('student_id', user.id)

        const maxAttempts = exam.max_attempts ?? 1
        if (maxAttempts !== 0 && (attemptCount ?? 0) >= maxAttempts) {
            return NextResponse.json({
                error: 'Maximum attempts reached',
                attempts_used: attemptCount,
                max_attempts: maxAttempts
            }, { status: 403 })
        }

        // Build SAFE response (NO ANSWER KEYS!)
        const safeExam = {
            id: exam.id,
            title: exam.title,
            duration: exam.duration,
            total_questions: exam.total_questions,
            pdf_url: exam.pdf_url,
            is_scheduled: exam.is_scheduled,
            start_time: exam.start_time,
            end_time: exam.end_time,
            max_attempts: exam.max_attempts,
            attempts_used: attemptCount ?? 0,

            // MC questions: Only question numbers, NO correct answers
            mc_questions: exam.mc_answers
                ? exam.mc_answers.map((q: { question: number }) => ({ question: q.question }))
                : Array.from({ length: exam.correct_answers?.length || exam.total_questions }, (_, i) => ({ question: i + 1 })),

            // TF questions: Only question numbers, NO correct boolean values
            tf_questions: exam.tf_answers
                ? exam.tf_answers.map((q: { question: number }) => ({ question: q.question }))
                : [],

            // SA questions: Only question numbers, NO correct answers
            sa_questions: exam.sa_answers
                ? exam.sa_answers.map((q: { question: number }) => ({ question: q.question }))
                : []
        }

        return NextResponse.json(safeExam)

    } catch (error) {
        console.error('Get exam questions error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
