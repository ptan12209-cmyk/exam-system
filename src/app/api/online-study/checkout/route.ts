import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// POST /api/online-study/checkout
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { subjectKey } = body as { subjectKey: string }

  if (!subjectKey) {
    throw new ApiError("BAD_REQUEST", "Thiếu mã môn học (subjectKey)", 400)
  }

  const adminSupabase = createAdminClient()

  // 1. Kiểm tra xem môn học đã được mở khóa trước đó chưa
  const { data: existing, error: checkError } = await adminSupabase
    .from("student_online_subjects")
    .select("id")
    .eq("student_id", user.id)
    .eq("subject", subjectKey)
    .maybeSingle()

  if (checkError) throw checkError

  if (existing) {
    return NextResponse.json(successResponse({ message: "Môn học đã được mở khóa trước đó", unlockedSubject: subjectKey }))
  }

  // 2. Thêm quyền học môn cho học sinh
  const { error: insertError } = await adminSupabase
    .from("student_online_subjects")
    .insert({
      student_id: user.id,
      subject: subjectKey,
      assigned_by: user.id // Tự kích hoạt thông qua thanh toán
    })

  if (insertError) throw insertError

  // 3. Đảm bảo vai trò trong hồ sơ cá nhân chuyển thành online_student để qua cửa Middleware
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ role: "online_student" })
    .eq("id", user.id)

  if (profileError) throw profileError

  return NextResponse.json(successResponse({ success: true, unlockedSubject: subjectKey }))
}

export const POST = withErrorHandler(handlePOST)
