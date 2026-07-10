import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// POST /api/online-study/assign-role (Cấp quyền các môn học được chọn hoặc toàn bộ)
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // Only teachers or admins can edit permissions
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { student_id, subjects } = body as {
    student_id: string
    subjects: string[] // e.g., ['math', 'physics'] or ['all'] or []
  }

  if (!student_id || !Array.isArray(subjects)) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (student_id, subjects[])", 400)
  }

  const adminSupabase = createAdminClient()

  // 1. Delete all existing assigned subjects for this student
  const { error: deleteError } = await adminSupabase
    .from("student_online_subjects")
    .delete()
    .eq("student_id", student_id)

  if (deleteError) throw deleteError

  // 2. Insert new subjects if array is not empty
  if (subjects.length > 0) {
    const recordsToInsert = subjects.map(sub => ({
      student_id,
      subject: sub,
      assigned_by: user.id
    }))

    const { error: insertError } = await adminSupabase
      .from("student_online_subjects")
      .insert(recordsToInsert)

    if (insertError) throw insertError
  }

  // 3. Keep profiles.role in sync with e-learning access
  // If student has at least one assigned subject, set role to 'online_student'. Otherwise, set to 'student'.
  const targetRole = subjects.length > 0 ? "online_student" : "student"
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({ role: targetRole })
    .eq("id", student_id)

  if (profileError) throw profileError

  return NextResponse.json(successResponse({ student_id, role: targetRole, subjects }))
}

// GET /api/online-study/assign-role (Lấy danh sách học sinh và các môn học được cấp quyền tương ứng)
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const search = request.nextUrl.searchParams.get("search") || ""

  const adminSupabase = createAdminClient()

  // Fetch profiles
  let query = adminSupabase
    .from("profiles")
    .select("id, full_name, email, role, class")
    .in("role", ["student", "online_student"])
    .order("full_name", { ascending: true })

  if (search.trim()) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: students, error: studentsError } = await query
  if (studentsError) throw studentsError

  // Fetch all assigned subjects for these students
  const studentIds = (students || []).map(s => s.id)
  let assignedSubjects: { student_id: string; subject: string }[] = []

  if (studentIds.length > 0) {
    const { data: subjectsData, error: subjectsError } = await adminSupabase
      .from("student_online_subjects")
      .select("student_id, subject")
      .in("student_id", studentIds)

    if (subjectsError) throw subjectsError
    assignedSubjects = subjectsData || []
  }

  // Get total lessons count in database
  let totalLessonsCount = 0
  try {
    const { count, error: countError } = await adminSupabase
      .from("online_lessons")
      .select("*", { count: "exact", head: true })
    if (!countError && count !== null) {
      totalLessonsCount = count
    }
  } catch (e) {
    console.error("Lỗi đếm số bài giảng:", e)
  }

  // Fetch all lesson progress records for these students
  let progresses: { student_id: string; completed: boolean }[] = []
  if (studentIds.length > 0) {
    try {
      const { data: progressData } = await adminSupabase
        .from("student_lesson_progress")
        .select("student_id, completed")
        .in("student_id", studentIds)
        .eq("completed", true)
      progresses = progressData || []
    } catch (e) {
      console.error("Lỗi lấy tiến độ bài giảng:", e)
    }
  }

  // Map subjects and progress back to students
  const studentsWithData = (students || []).map(student => {
    const subjects = assignedSubjects
      .filter(s => s.student_id === student.id)
      .map(s => s.subject)

    const completedCount = progresses.filter(p => p.student_id === student.id).length
    const progressPercent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0

    return {
      ...student,
      online_subjects: subjects,
      progress_percent: progressPercent
    }
  })

  return NextResponse.json(successResponse(studentsWithData))
}

export const POST = withErrorHandler(handlePOST)
export const GET = withErrorHandler(handleGET)
