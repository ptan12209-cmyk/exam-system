import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { requireOnlineSubject } from "@/lib/online-study-auth"
import { requireSingleDevice } from "@/lib/device-binding"

// GET /api/online-study/progress
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const { searchParams } = new URL(request.url)
  const studentIdParam = searchParams.get("studentId")

  let targetStudentId = user.id

  if (studentIdParam && studentIdParam !== user.id) {
    await requireRole(supabase, user.id, ["teacher", "admin"])
    targetStudentId = studentIdParam
  } else {
    await requireSingleDevice(request, createAdminClient(), user.id)
  }

  // Prefer user-scoped client for own progress; admin only for cross-user teacher reads
  const client =
    targetStudentId === user.id ? supabase : createAdminClient()

  const { data, error } = await client
    .from("student_lesson_progress")
    .select("lesson_id, completed, watched_seconds, updated_at")
    .eq("student_id", targetStudentId)

  if (error) {
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      return NextResponse.json(successResponse([]))
    }
    throw error
  }

  return NextResponse.json(successResponse(data || []))
}

// POST /api/online-study/progress — only for lessons in unlocked subjects
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`progress:${user.id}:${ip}`, 60, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 60,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const body = await request.json().catch(() => ({}))
  const lessonId = typeof body.lessonId === "string" ? body.lessonId : ""
  const completed = body.completed !== false
  const watchedSeconds =
    typeof body.watchedSeconds === "number" && body.watchedSeconds >= 0
      ? Math.min(Math.floor(body.watchedSeconds), 86400)
      : 0

  if (!lessonId) {
    throw new ApiError("BAD_REQUEST", "Thiếu lessonId", 400)
  }

  // V3: students cannot SELECT online_lessons — resolve subject via admin
  const admin = createAdminClient()
  const { data: lesson, error: lessonError } = await admin
    .from("online_lessons")
    .select("id, folder_id, online_folders!inner(subject)")
    .eq("id", lessonId)
    .maybeSingle()

  if (lessonError) throw lessonError
  if (!lesson) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy bài học", 404)
  }

  const folderSubject =
    (lesson as { online_folders?: { subject?: string } }).online_folders?.subject
  if (!folderSubject) {
    throw new ApiError("NOT_FOUND", "Không xác định được môn của bài học", 404)
  }

  await requireOnlineSubject(supabase, user.id, folderSubject)
  await requireSingleDevice(request, admin, user.id)

  // Own-row write via user client when RLS allows; fallback admin for legacy policies
  const { error } = await supabase.from("student_lesson_progress").upsert(
    {
      student_id: user.id,
      lesson_id: lessonId,
      completed,
      watched_seconds: watchedSeconds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lesson_id" }
  )

  if (error) {
    // Fallback if RLS blocks (migration not applied yet) — still entitlement-checked above
    const adminSupabase = createAdminClient()
    const { error: adminError } = await adminSupabase
      .from("student_lesson_progress")
      .upsert(
        {
          student_id: user.id,
          lesson_id: lessonId,
          completed,
          watched_seconds: watchedSeconds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,lesson_id" }
      )
    if (adminError) throw adminError
  }

  return NextResponse.json(
    successResponse({ success: true, message: "Ghi nhận tiến độ bài học thành công" })
  )
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
