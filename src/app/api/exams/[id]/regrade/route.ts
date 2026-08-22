import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { calculateScore } from '@/services/scoring'
import type { MCAnswer, TFAnswer, SAAnswer } from '@/types'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface RegradeRequest {
    mc_answers?: MCAnswer[]
    tf_answers?: TFAnswer[]
    sa_answers?: SAAnswer[]
}

/**
 * POST /api/exams/[id]/regrade
 * Teacher recalculates scores of all submissions after editing answer keys.
 * Writes go through the service role (clients cannot UPDATE submissions).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const examId = resolvedParams.id
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 🔒 Rate limit regrades
        const { allowed } = await checkRateLimit(`regrade:${user.id}`, 10, 300)
        if (!allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        // Ownership check via RLS-scoped client
        const { data: exam } = await supabase
            .from('exams')
            .select('id')
            .eq('id', examId)
            .eq('teacher_id', user.id)
            .single()

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found or not owned by you' }, { status: 403 })
        }

        const body = (await request.json()) as RegradeRequest
        const mcAnswers = body.mc_answers ?? []
        const tfAnswers = body.tf_answers ?? []
        const saAnswers = body.sa_answers ?? []

        const admin = createAdminClient()
        const { data: submissions, error: subsError } = await admin
            .from('submissions')
            .select('id, student_answers, tf_student_answers, sa_student_answers')
            .eq('exam_id', examId)

        if (subsError) {
            return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 })
        }
        if (!submissions?.length) {
            return NextResponse.json({ success: true, updated: 0 })
        }

        let updatedCount = 0
        for (const sub of submissions) {
            const result = calculateScore(
                (sub.student_answers || []) as (string | null)[],
                (sub.tf_student_answers ?? []) as unknown as TFAnswer[],
                (sub.sa_student_answers ?? []) as unknown as { question: number; answer: string }[],
                {
                    mc_answers: mcAnswers,
                    tf_answers: tfAnswers,
                    sa_answers: saAnswers,
                }
            )

            const { error: updateError } = await admin
                .from('submissions')
                .update({
                    score: result.score,
                    correct_count: Math.round(result.totalCorrect),
                    mc_correct: result.details.mc.correct,
                    tf_correct: result.details.tf.correct,
                    sa_correct: result.details.sa.correct,
                })
                .eq('id', sub.id)

            if (!updateError) updatedCount++
        }

        return NextResponse.json({ success: true, updated: updatedCount })
    } catch (error) {
        console.error('Regrade error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
