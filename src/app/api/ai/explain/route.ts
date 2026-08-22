import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { aiEngineConfigured, chat } from "@/lib/ai/engine"
import { buildExplainMessages } from "@/lib/ai/prompts"

export const runtime = "nodejs"

/**
 * POST /api/ai/explain
 * Teacher-only. Generates a short Vietnamese explanation for one question.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        await requireRole(supabase, user.id, ["teacher", "admin"])

        if (!aiEngineConfigured()) {
            return NextResponse.json({ error: "AI Engine chưa cấu hình" }, { status: 503 })
        }

        const { allowed } = await checkRateLimit(`ai-explain:${user.id}`, 30, 300)
        if (!allowed) return NextResponse.json({ error: "Thử lại sau ít phút" }, { status: 429 })

        const body = (await request.json()) as {
            question_text?: string
            options?: string[]
            correct_answer?: string
            subject?: string
        }
        const questionText = (body.question_text ?? "").trim()
        const correctAnswer = (body.correct_answer ?? "").toString().trim()
        if (!questionText || !correctAnswer) {
            return NextResponse.json({ error: "Thiếu câu hỏi hoặc đáp án" }, { status: 400 })
        }

        const result = await chat({
            messages: buildExplainMessages({
                questionText: questionText.slice(0, 1500),
                options: body.options?.slice(0, 4).map((o) => String(o).slice(0, 300)),
                correctAnswer: correctAnswer.slice(0, 300),
                subject: body.subject?.slice(0, 60),
            }),
            temperature: 0.3,
            maxTokens: 800,
        })

        return NextResponse.json({
            success: true,
            explanation: result.text.trim(),
            provider: result.providerId,
        })
    } catch (error) {
        console.error("[ai/explain]", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi không xác định" },
            { status: 500 }
        )
    }
}
