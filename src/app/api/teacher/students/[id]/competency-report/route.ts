import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { aiEngineConfigured, chat, AiEngineError } from "@/lib/ai/engine"
import { buildCompetencyReportMessages } from "@/lib/ai/prompts"
import { fetchStudentCompetency } from "@/lib/competency/server"

export const runtime = "nodejs"

/**
 * POST /api/teacher/students/[id]/competency-report
 * Teacher-only. Access is re-verified server-side; only PII-free aggregates
 * (numbers + subject names) are sent to the model.
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: studentId } = await params
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        if (!aiEngineConfigured()) {
            return NextResponse.json({ error: "AI Engine chưa cấu hình" }, { status: 503 })
        }

        const { allowed } = await checkRateLimit(`ai-report:${user.id}`, 15, 300)
        if (!allowed) return NextResponse.json({ error: "Thử lại sau ít phút" }, { status: 429 })

        const data = await fetchStudentCompetency(supabase, user.id, studentId)
        if (!data) {
            return NextResponse.json({ error: "Không có quyền xem học sinh này" }, { status: 403 })
        }

        const { profile, result } = data
        if (result.totals.attempts === 0) {
            return NextResponse.json({ error: "Học sinh chưa có bài làm nào để nhận xét." }, { status: 400 })
        }

        // PII-free aggregate: numbers + subject labels only
        const aggregates = {
            attempts: result.totals.attempts,
            average_score: result.totals.average,
            best_score: result.totals.best,
            trend: result.trend,
            consistency: result.consistency,
            by_subject: result.bySubject.map((s) => ({
                subject: s.subject, attempts: s.attempts,
                average: s.average, latest: s.latest, mastery: s.mastery,
            })),
            by_skill_type: {
                trac_nghiem: `${result.bySkillType.mc.percent}%`,
                dung_sai: `${result.bySkillType.tf.percent}%`,
                tra_loi_ngan: `${result.bySkillType.sa.percent}%`,
            },
        }

        const studentLabel =
            (profile.full_name || "học sinh") +
            (profile.grade ? ` (lớp ${profile.grade}${profile.class ?? ""})` : "")

        const chatResult = await chat({
            messages: buildCompetencyReportMessages({ studentLabel, aggregates }),
            temperature: 0.5,
            maxTokens: 700,
        })

        return NextResponse.json({
            success: true,
            report: chatResult.text.trim(),
            provider: chatResult.providerId,
        })
    } catch (error) {
        console.error("[competency-report]", error)
        const status = error instanceof AiEngineError ? error.statusCode : 500
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi không xác định" },
            { status }
        )
    }
}
