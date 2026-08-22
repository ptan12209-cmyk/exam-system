import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { aiEngineConfigured, chat, AiEngineError } from "@/lib/ai/engine"
import { buildGenerateQuestionsMessages } from "@/lib/ai/prompts"
import { extractJsonArray } from "@/lib/ai/json-utils"
import { z } from "zod"

export const runtime = "nodejs"

const MAX_CONTENT_CHARS = 12_000

const draftQuestionSchema = z.object({
    question_type: z.enum(["mc", "tf", "sa"]),
    question_text: z.string().trim().min(5).max(1200),
    options: z.array(z.string().trim().min(1).max(400)).max(4).optional(),
    correct_answer: z.union([z.string(), z.number(), z.record(z.string(), z.boolean())]),
    explanation: z.string().trim().max(1500).optional(),
})

/**
 * POST /api/ai/generate-questions
 * Teacher-only. Generates draft questions from pasted theory content.
 * If `bank_id` is provided, validated drafts are inserted straight into the
 * question bank; otherwise drafts are returned for review/copy.
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

        const { allowed } = await checkRateLimit(`ai-genq:${user.id}`, 10, 300)
        if (!allowed) return NextResponse.json({ error: "Thử lại sau ít phút" }, { status: 429 })

        const body = (await request.json()) as {
            content?: string
            mc_count?: number
            tf_count?: number
            sa_count?: number
            subject?: string
            grade?: number | null
            bank_id?: string | null
        }

        const content = (body.content ?? "").trim()
        if (content.length < 50) {
            return NextResponse.json({ error: "Nội dung lý thuyết quá ngắn (tối thiểu 50 ký tự)" }, { status: 400 })
        }
        if (content.length > MAX_CONTENT_CHARS) {
            return NextResponse.json({ error: `Nội dung tối đa ${MAX_CONTENT_CHARS} ký tự` }, { status: 413 })
        }

        const clamp = (n: unknown, max: number) => Math.max(0, Math.min(max, Number(n) || 0))
        const input = {
            content,
            mcCount: clamp(body.mc_count, 40),
            tfCount: clamp(body.tf_count, 20),
            saCount: clamp(body.sa_count, 20),
            subject: body.subject,
            grade: body.grade ?? null,
        }
        if (input.mcCount + input.tfCount + input.saCount === 0) {
            return NextResponse.json({ error: "Chọn ít nhất 1 câu hỏi" }, { status: 400 })
        }

        const messages = buildGenerateQuestionsMessages(input)
        const result = await chat({ messages, temperature: 0.5, maxTokens: 8000 })

        const arr = extractJsonArray(result.text)
        if (!arr) {
            throw new AiEngineError("AI không trả về mảng JSON hợp lệ — thử lại hoặc giảm số câu.", 502)
        }

        // Validate + normalize each draft (drop invalid ones instead of failing all)
        const drafts = []
        for (const raw of arr) {
            const parsed = draftQuestionSchema.safeParse(raw)
            if (parsed.success) drafts.push(parsed.data)
        }

        if (drafts.length === 0) {
            throw new AiEngineError("AI trả về câu hỏi không hợp lệ — thử lại.", 502)
        }

        // Optional direct save into a question bank
        let savedCount: number | null = null
        if (body.bank_id) {
            const rows = drafts.map((d) => ({
                teacher_id: user.id,
                bank_id: body.bank_id as string,
                subject: body.subject || "other",
                question_type: d.question_type,
                content: d.question_text,
                question_text: d.question_text,
                options: d.question_type === "mc" ? (d.options ?? []) : d.options ?? null,
                correct_answer:
                    typeof d.correct_answer === "object" && d.correct_answer !== null
                        ? d.correct_answer
                        : String(d.correct_answer),
                explanation: d.explanation ?? null,
                source: "ai-generated",
            }))
            const { error: insertError } = await supabase.from("questions").insert(rows)
            if (insertError) {
                return NextResponse.json({ error: `Không lưu được vào ngân hàng: ${insertError.message}` }, { status: 500 })
            }
            savedCount = rows.length
        }

        return NextResponse.json({
            success: true,
            drafts,
            saved_count: savedCount,
            provider: result.providerId,
            model: result.model,
        })
    } catch (error) {
        console.error("[ai/generate-questions]", error)
        const status = error instanceof AiEngineError ? error.statusCode : 500
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi không xác định" },
            { status }
        )
    }
}
