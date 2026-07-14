import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  category: z.enum(["bug", "idea", "praise", "other"]),
  body: z.string().trim().min(5).max(2000),
  subject_key: z.string().trim().max(64).nullable().optional(),
  lesson_id: z.string().uuid().nullable().optional(),
  page_path: z.string().trim().max(500).nullable().optional(),
})

async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rate = await checkRateLimit(`feedback:${ip}`, 5, 3600)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 5,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(
      "BAD_REQUEST",
      parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
      400
    )
  }

  const { category, body, subject_key, lesson_id, page_path } = parsed.data

  const { data, error } = await supabase
    .from("system_feedback")
    .insert({
      user_id: user.id,
      category,
      body,
      subject_key: subject_key || null,
      lesson_id: lesson_id || null,
      page_path: page_path || null,
    })
    .select("id, created_at")
    .single()

  if (error) {
    console.error("[feedback] insert", error)
    throw new ApiError("INTERNAL", "Không gửi được góp ý. Thầy có thể chưa chạy migration.", 500)
  }

  return NextResponse.json(
    successResponse({
      id: data.id,
      message: "Cảm ơn em đã góp ý! Thầy sẽ xem và cải thiện hệ thống.",
    })
  )
}

async function handleGET() {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const { data, error } = await supabase
    .from("system_feedback")
    .select("id, category, body, status, created_at, page_path, subject_key")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    throw new ApiError("INTERNAL", error.message, 500)
  }

  return NextResponse.json(successResponse({ items: data || [] }))
}

export const POST = withErrorHandler(handlePOST)
export const GET = withErrorHandler(handleGET)
