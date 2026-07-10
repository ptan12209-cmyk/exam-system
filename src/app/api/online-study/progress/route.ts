import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse } from "@/lib/api-utils"

// GET /api/online-study/progress
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const { searchParams } = new URL(request.url)
  const studentIdParam = searchParams.get("studentId")

  let targetStudentId = user.id

  // Nếu giáo viên/admin yêu cầu lấy tiến độ của học sinh khác
  if (studentIdParam && studentIdParam !== user.id) {
    await requireRole(supabase, user.id, ["teacher", "admin"])
    targetStudentId = studentIdParam
  }

  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
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

// POST /api/online-study/progress
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { lessonId, completed = true, watchedSeconds = 0 } = body

  if (!lessonId) {
    return NextResponse.json({ error: "Thiếu lessonId" }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from("student_lesson_progress")
    .upsert({
      student_id: user.id,
      lesson_id: lessonId,
      completed,
      watched_seconds: watchedSeconds,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "student_id,lesson_id"
    })

  if (error) throw error

  return NextResponse.json(successResponse({ success: true, message: "Ghi nhận tiến độ bài học thành công" }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
