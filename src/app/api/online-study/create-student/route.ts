import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

const createStudentSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  fullName: z.string().trim().min(1, "Thiếu họ tên"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  studentClass: z.string().trim().nullable().optional(),
})

// POST /api/online-study/create-student
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // Chỉ giáo viên hoặc admin mới được cấp tài khoản học viên trực tiếp
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const raw = await request.json().catch(() => null)
  const parsed = createStudentSchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ"
    throw new ApiError("BAD_REQUEST", msg, 400)
  }
  const { email, fullName, password, studentClass } = parsed.data

  const adminSupabase = createAdminClient()

  // 1. Tạo tài khoản trong auth.users bằng Admin client để không bị logout admin hiện tại
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true, // Tự động xác thực email để học viên đăng nhập được ngay
    user_metadata: {
      role: "student",
      full_name: fullName
    }
  })

  if (authError) {
    throw new ApiError("BAD_REQUEST", `Lỗi tạo tài khoản: ${authError.message}`, 400)
  }

  const newStudentId = authData.user.id

  // 2. Cập nhật profile — teacher-provisioned: skip email OTP
  const now = new Date().toISOString()
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      full_name: fullName,
      class: studentClass || null,
      role: "student",
      email: email.toLowerCase().trim(),
      account_source: "teacher",
      email_verified_at: now,
    })
    .eq("id", newStudentId)

  if (profileError) {
    // Nếu lỗi cập nhật profile, ta cố gắng xóa user auth vừa tạo để tránh mồ côi dữ liệu
    await adminSupabase.auth.admin.deleteUser(newStudentId)
    throw profileError
  }

  // 3. Lấy profile mới tạo thành công để trả về cho client
  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email, role, class")
    .eq("id", newStudentId)
    .single()

  return NextResponse.json(successResponse({
    student: profileData,
    message: "Tạo tài khoản học viên trực tiếp thành công"
  }))
}

export const POST = withErrorHandler(handlePOST)
