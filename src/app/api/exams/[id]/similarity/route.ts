import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { detectCollusion, type SimilaritySubmission } from "@/lib/anti-cheat/similarity"

export const runtime = "nodejs"

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/exams/[id]/similarity
 * Teacher-only, exam-owner verified. Computes suspicious answer-pattern pairs
 * server-side. READ-ONLY: the system flags, the teacher judges.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id: examId } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { allowed } = await checkRateLimit(`similarity:${user.id}`, 15, 300)
        if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 })

        // Owner check + keys in one query (RLS allows owner to read all columns)
        const { data: exam } = await supabase
            .from("exams")
            .select("id, total_questions, mc_answers, tf_answers, sa_answers, correct_answers")
            .eq("id", examId)
            .eq("teacher_id", user.id)
            .single()

        if (!exam) {
            return NextResponse.json({ error: "Exam not found or not owned by you" }, { status: 403 })
        }

        // Build the correct-key map for MC questions
        const mcRows = (exam.mc_answers ?? null) as { question: number; answer: string }[] | null
        let key: Record<number, string> = {}
        if (mcRows && Array.isArray(mcRows) && mcRows.length > 0) {
            for (const row of mcRows) key[row.question] = String(row.answer).toUpperCase()
        } else if (Array.isArray(exam.correct_answers)) {
            ;(exam.correct_answers as string[]).forEach((ans, i) => { key[i + 1] = String(ans).toUpperCase() })
        }
        // TF/SA have heterogeneous formats — collusion signal focuses on MC,
        // which is where copying is statistically measurable.
        if (Object.keys(key).length === 0) {
            return NextResponse.json({
                success: true,
                total_submissions: 0,
                flagged: [],
                note: "Đề không có phần trắc nghiệm — phân tích trùng đáp án chỉ áp dụng cho MC.",
            })
        }

        const { data: subsData } = await supabase
            .from("submissions")
            .select(`
                id,
                student_id,
                score,
                submitted_at,
                student_answers,
                mc_student_answers,
                student:profiles!student_id(full_name)
            `)
            .eq("exam_id", examId)

        const submissions: SimilaritySubmission[] = ((subsData ?? []) as unknown as Array<{
            id: string
            student_id: string
            score: number
            submitted_at: string
            student_answers: (string | null)[] | null
            mc_student_answers: { question: number; answer: string | null }[] | null
            student: { full_name: string | null } | { full_name: string | null }[] | null
        }>).map((row) => {
            const rawStudent = Array.isArray(row.student) ? row.student[0] : row.student
            const answers: Record<number, string | null> = {}
            if (row.mc_student_answers && Array.isArray(row.mc_student_answers)) {
                for (const item of row.mc_student_answers) {
                    answers[item.question] = item.answer == null ? null : String(item.answer).toUpperCase()
                }
            } else if (row.student_answers) {
                row.student_answers.forEach((a, i) => { answers[i + 1] = a == null ? null : String(a).toUpperCase() })
            }
            return {
                id: row.id,
                student_id: row.student_id,
                student_name: rawStudent?.full_name ?? null,
                score: Number(row.score) || 0,
                submitted_at: row.submitted_at,
                answers,
            }
        })

        const flagged = detectCollusion(submissions, key)

        return NextResponse.json({
            success: true,
            total_submissions: submissions.length,
            flagged_count: flagged.length,
            flagged,
        })
    } catch (error) {
        console.error("[similarity]", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi không xác định" },
            { status: 500 }
        )
    }
}
