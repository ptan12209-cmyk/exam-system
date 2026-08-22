import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { rateLimiters, rateLimitResponse } from '@/lib/rate-limit'

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

        // 🔒 RATE LIMITING
        const rateLimitResult = await rateLimiters.examFetch(user.id)
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult)
        }

        // Caller profile for eligibility checks (grade / class / nickname)
        const { data: profile } = await supabase
            .from('profiles')
            .select('grade, class_suffix, nickname, account_status')
            .eq('id', user.id)
            .single()

        if (!profile || profile.account_status !== 'active') {
            return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
        }

        // Admin client: answer keys must never cross the RLS boundary to the
        // client, so the server reads them with the service role and returns
        // a sanitized payload only.
        const admin = createAdminClient()

        const { data: exam, error: examError } = await admin
            .from('exams')
            .select(`
                id, title, duration, total_questions, pdf_url, status,
                is_scheduled, start_time, end_time, max_attempts,
                mc_answers, tf_answers, sa_answers, correct_answers,
                assigned_to, target_grade, target_classes, security_level
            `)
            .eq('id', examId)
            .eq('status', 'published')
            .single()

        if (examError || !exam) {
            return NextResponse.json({ error: 'Exam not found or not published' }, { status: 404 })
        }

        // 🎯 ELIGIBILITY: assigned cohort + grade + class targeting
        const isStudentX = profile.nickname === 'X'
        if ((exam.assigned_to === 'x') !== isStudentX) {
            return NextResponse.json({ error: 'You are not assigned to this exam' }, { status: 403 })
        }
        if (!isStudentX && profile.grade !== null && exam.target_grade !== null && exam.target_grade !== profile.grade) {
            return NextResponse.json({ error: 'You are not assigned to this exam' }, { status: 403 })
        }
        const classSuffix = profile.class_suffix?.toUpperCase()
        if (!isStudentX && exam.target_classes && exam.target_classes.length > 0) {
            const allowed = exam.target_classes.map((c: string) => c.toUpperCase())
            if (!classSuffix || !allowed.includes(classSuffix)) {
                return NextResponse.json({ error: 'You are not assigned to this exam' }, { status: 403 })
            }
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

        // Private bucket: issue a short-lived signed URL for the exam PDF
        let pdfUrl: string | null = exam.pdf_url ?? null
        if (pdfUrl) {
            try {
                const url = new URL(pdfUrl)
                const pathMatch = url.pathname.match(/\/object\/(?:public|signed)\/([^/]+)\/(.+)$/)
                if (pathMatch) {
                    const bucket = pathMatch[1]
                    const objectPath = decodeURIComponent(pathMatch[2])
                    const { data: signed } = await admin
                        .storage
                        .from(bucket)
                        .createSignedUrl(objectPath, 6 * 60 * 60)
                    if (signed?.signedUrl) {
                        pdfUrl = signed.signedUrl
                    } else {
                        pdfUrl = null
                    }
                } else {
                    // Not a Supabase object URL (external host) — pass through
                    pdfUrl = null
                }
            } catch {
                pdfUrl = null
            }
        }

        // Build SAFE response (NO ANSWER KEYS!)
        const mcAnswerRows = (exam.mc_answers ?? null) as { question: number }[] | null
        const tfAnswerRows = (exam.tf_answers ?? null) as { question: number }[] | null
        const saAnswerRows = (exam.sa_answers ?? null) as { question: number }[] | null

        const safeExam = {
            id: exam.id,
            title: exam.title,
            duration: exam.duration,
            total_questions: exam.total_questions,
            pdf_url: pdfUrl,
            is_scheduled: exam.is_scheduled,
            start_time: exam.start_time,
            end_time: exam.end_time,
            max_attempts: exam.max_attempts,
            attempts_used: attemptCount ?? 0,
            security_level: exam.security_level ?? 1,

            // MC questions: Only question numbers, NO correct answers
            mc_questions: mcAnswerRows
                ? mcAnswerRows.map((q) => ({ question: q.question }))
                : Array.from({ length: exam.correct_answers?.length || exam.total_questions }, (_, i) => ({ question: i + 1 })),

            // TF questions: Only question numbers, NO correct boolean values
            tf_questions: tfAnswerRows
                ? tfAnswerRows.map((q) => ({ question: q.question }))
                : [],

            // SA questions: Only question numbers, NO correct answers
            sa_questions: saAnswerRows
                ? saAnswerRows.map((q) => ({ question: q.question }))
                : []
        }

        return NextResponse.json(safeExam)

    } catch (error) {
        console.error('Get exam questions error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
