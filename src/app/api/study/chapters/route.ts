import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/study/chapters?subject=math&grade=10
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  const subject = request.nextUrl.searchParams.get("subject")
  const gradeParam = request.nextUrl.searchParams.get("grade")

  if (!subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số môn học (subject)", 400)
  }

  // Get user profile role and grade
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, grade")
    .eq("id", user.id)
    .single()

  let query = supabase.from("study_chapters").select("*").eq("subject", subject)

  if (profile?.role === "student") {
    if (profile.grade === null) {
      return NextResponse.json(successResponse([])) // Students without a grade see nothing
    }
    query = query.eq("grade", profile.grade)
  } else if (gradeParam) {
    const gradeNum = parseInt(gradeParam)
    if (!isNaN(gradeNum)) {
      query = query.eq("grade", gradeNum)
    }
  }

  const { data: chapters, error } = await query.order("order_index", { ascending: true })
  if (error) throw error

  return NextResponse.json(successResponse(chapters || []))
}

// POST /api/study/chapters
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, subject, grade, title, order_index } = body as {
    id?: string
    subject: string
    grade: number
    title: string
    order_index?: number
  }

  if (!subject || !grade || !title) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (subject, grade, title)", 400)
  }

  if (grade < 6 || grade > 12) {
    throw new ApiError("BAD_REQUEST", "Khối lớp phải từ 6 đến 12", 400)
  }

  let dbResult
  if (id) {
    // Update existing chapter
    const { data, error } = await supabase
      .from("study_chapters")
      .update({
        subject,
        grade,
        title,
        order_index: order_index || 1
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) throw error
    dbResult = data
  } else {
    // Create new chapter
    const { data, error } = await supabase
      .from("study_chapters")
      .insert({
        subject,
        grade,
        title,
        order_index: order_index || 1
      })
      .select()
      .single()

    if (error) throw error
    dbResult = data
  }

  return NextResponse.json(successResponse(dbResult))
}

// DELETE /api/study/chapters?id=chapter-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID chương cần xóa", 400)
  }

  const { error } = await supabase.from("study_chapters").delete().eq("id", id)
  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
