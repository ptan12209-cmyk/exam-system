import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// POST /api/online-study/assign-role
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // Only teachers or admins can change student roles
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { student_id, role } = body as {
    student_id: string
    role: "student" | "online_student"
  }

  if (!student_id || !role) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (student_id, role)", 400)
  }

  if (role !== "student" && role !== "online_student") {
    throw new ApiError("BAD_REQUEST", "Vai trò không hợp lệ", 400)
  }

  // Use createAdminClient to bypass RLS when editing profiles table
  const adminSupabase = createAdminClient()
  const { data: updatedProfile, error } = await adminSupabase
    .from("profiles")
    .update({ role })
    .eq("id", student_id)
    .select("id, full_name, email, role")
    .single()

  if (error) throw error

  return NextResponse.json(successResponse(updatedProfile))
}

// GET /api/online-study/assign-role (Lấy danh sách tất cả học sinh để hiển thị trong panel cấp quyền)
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const search = request.nextUrl.searchParams.get("search") || ""

  // Use createAdminClient to read profiles safely to ensure teachers can see all students
  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from("profiles")
    .select("id, full_name, email, role, class")
    .in("role", ["student", "online_student"])
    .order("full_name", { ascending: true })

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: students, error } = await query
  if (error) throw error

  return NextResponse.json(successResponse(students || []))
}

export const POST = withErrorHandler(handlePOST)
export const GET = withErrorHandler(handleGET)
