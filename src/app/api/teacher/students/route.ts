import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { ApiError, successResponse, withErrorHandler } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const createStudentSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(120),
  studentClass: z.string().trim().max(30).nullable().optional(),
  grade: z.number().int().min(6).max(12).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
})

const updateStudentSchema = z.object({
  studentId: z.string().uuid(),
  accountStatus: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(8).max(72).optional(),
}).refine((value) => value.accountStatus || value.password, {
  message: "Cần có trạng thái hoặc mật khẩu mới.",
})

async function requireTeacher() {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])
  return { supabase, user }
}

async function handleGET() {
  const { user } = await requireTeacher()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("parent_student_links")
    .select(`
      student_id,
      created_at,
      student:profiles!parent_student_links_student_id_fkey(
        id, full_name, email, class, grade, phone, account_status, created_at, last_login_at
      )
    `)
    .eq("parent_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error

  return NextResponse.json(successResponse({
    students: (data || []).map((link) => ({
      ...(Array.isArray(link.student) ? link.student[0] : link.student),
      linked_at: link.created_at,
    })),
  }))
}

async function handlePOST(request: NextRequest) {
  const { user } = await requireTeacher()
  const rate = await checkRateLimit(
    `teacher-create-student:${user.id}:${getClientIP(request)}`,
    30,
    3600
  )
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 30,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const parsed = createStudentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Thông tin học sinh không hợp lệ.",
      400
    )
  }

  const { email, password, fullName, studentClass, grade, phone } = parsed.data
  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name: fullName,
      account_source: "teacher",
      provisioned_by: user.id,
    },
    app_metadata: {
      role: "student",
      account_source: "teacher",
      account_status: "active",
      provisioned_by: user.id,
    },
  })

  if (authError || !authData.user) {
    const message = authError?.message || "Không thể tạo tài khoản học sinh."
    if (/already|registered|exists/i.test(message)) {
      throw new ApiError("EMAIL_EXISTS", "Email này đã có tài khoản.", 409)
    }
    throw new ApiError("AUTH_CREATE_FAILED", message, 400)
  }

  const studentId = authData.user.id
  try {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: studentId,
      role: "student",
      full_name: fullName,
      email,
      class: studentClass || null,
      grade: grade ?? null,
      phone: phone || null,
      account_source: "teacher",
      account_status: "active",
      created_by: user.id,
      email_verified_at: new Date().toISOString(),
    }, { onConflict: "id" })
    if (profileError) throw profileError

    const { error: linkError } = await admin.from("parent_student_links").upsert({
      parent_id: user.id,
      student_id: studentId,
      relationship: "teacher",
    }, { onConflict: "parent_id,student_id" })
    if (linkError) throw linkError
  } catch (error) {
    await admin.auth.admin.deleteUser(studentId)
    throw error
  }

  return NextResponse.json(successResponse({
    student: {
      id: studentId,
      email,
      full_name: fullName,
      class: studentClass || null,
      grade: grade ?? null,
      account_status: "active",
    },
    message: "Đã tạo tài khoản. Mật khẩu chỉ hiển thị trong phiên cấp tài khoản này.",
  }), { status: 201 })
}

async function handlePATCH(request: NextRequest) {
  const { user } = await requireTeacher()
  const parsed = updateStudentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message || "Yêu cầu không hợp lệ.",
      400
    )
  }

  const admin = createAdminClient()
  const { data: link } = await admin
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id)
    .eq("student_id", parsed.data.studentId)
    .maybeSingle()

  if (!link) {
    throw new ApiError("FORBIDDEN", "Bạn không quản lý học sinh này.", 403)
  }

  let existingAppMetadata: Record<string, unknown> = {}
  if (parsed.data.accountStatus) {
    const { data: authStudent, error: authStudentError } =
      await admin.auth.admin.getUserById(parsed.data.studentId)
    if (authStudentError) throw authStudentError
    existingAppMetadata = authStudent.user?.app_metadata || {}
  }

  const operations: PromiseLike<unknown>[] = []
  if (parsed.data.password || parsed.data.accountStatus) {
    operations.push(admin.auth.admin.updateUserById(parsed.data.studentId, {
      ...(parsed.data.password ? { password: parsed.data.password } : {}),
      ...(parsed.data.accountStatus
        ? {
            app_metadata: {
              ...existingAppMetadata,
              role: "student",
              account_source: "teacher",
              account_status: parsed.data.accountStatus,
              provisioned_by: user.id,
            },
          }
        : {}),
    }))
  }
  if (parsed.data.accountStatus) {
    operations.push(
      admin.from("profiles")
        .update({ account_status: parsed.data.accountStatus })
        .eq("id", parsed.data.studentId)
    )
  }

  const results = await Promise.all(operations)
  const failed = results.find((result) => {
    return Boolean(result && typeof result === "object" && "error" in result && result.error)
  }) as { error?: { message?: string } } | undefined
  if (failed?.error) throw new Error(failed.error.message || "Không thể cập nhật tài khoản.")

  return NextResponse.json(successResponse({ updated: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const PATCH = withErrorHandler(handlePATCH)
