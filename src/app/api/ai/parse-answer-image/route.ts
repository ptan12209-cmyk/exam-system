import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth-utils"
import { checkRateLimit } from "@/lib/rate-limit"
import { aiEngineConfigured, chat, AiEngineError } from "@/lib/ai/engine"
import { buildParseAnswerImageMessages } from "@/lib/ai/prompts"
import { extractJsonObject } from "@/lib/ai/json-utils"
import { parseAnswerJson } from "@/lib/answer-json"

export const runtime = "nodejs"

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB base64 payload

/**
 * POST /api/ai/parse-answer-image
 * Teacher-only. Reads an answer-key photo via the vision model and returns
 * the same ParsedAnswerJson shape as manual JSON input — so both flows are
 * interchangeable downstream.
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

        const { allowed } = await checkRateLimit(`ai-ocr:${user.id}`, 6, 300)
        if (!allowed) return NextResponse.json({ error: "Thử lại sau ít phút" }, { status: 429 })

        const body = (await request.json()) as {
            image_base64?: string
            mc_count?: number
            tf_count?: number
            sa_count?: number
        }
        let imageBase64 = body.image_base64?.trim() ?? ""
        if (!imageBase64) {
            return NextResponse.json({ error: "Thiếu ảnh" }, { status: 400 })
        }
        // Accept both raw base64 and full data URLs
        const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
        let dataUrl: string
        if (dataUrlMatch) {
            dataUrl = imageBase64
            imageBase64 = dataUrlMatch[2]
        } else {
            dataUrl = `data:image/jpeg;base64,${imageBase64}`
        }
        if (imageBase64.length > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: "Ảnh quá lớn (tối đa ~4MB)" }, { status: 413 })
        }

        const messages = buildParseAnswerImageMessages(dataUrl, {
            mcCount: body.mc_count,
            tfCount: body.tf_count,
            saCount: body.sa_count,
        })

        const result = await chat({ messages, needsVision: true, temperature: 0.1, maxTokens: 4096 })

        const json = extractJsonObject(result.text)
        if (!json) {
            throw new AiEngineError("AI không trả về JSON hợp lệ, thử chụp rõ ảnh hơn.", 502)
        }

        // Reuse the exact same validator as manual JSON input → one contract.
        const parsed = parseAnswerJson(JSON.stringify(json))

        return NextResponse.json({
            success: true,
            answers: parsed,
            provider: result.providerId,
            model: result.model,
        })
    } catch (error) {
        console.error("[ai/parse-answer-image]", error)
        const status = error instanceof AiEngineError ? error.statusCode : 500
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Lỗi không xác định" },
            { status }
        )
    }
}
