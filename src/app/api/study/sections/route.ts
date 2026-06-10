import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/study/sections?lesson_id=lesson-uuid
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  await requireAuth(supabase)
  
  const lessonId = request.nextUrl.searchParams.get("lesson_id")
  if (!lessonId) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số mã bài học (lesson_id)", 400)
  }

  const { data: sections, error } = await supabase
    .from("study_sections")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true })

  if (error) throw error

  return NextResponse.json(successResponse(sections || []))
}

// POST /api/study/sections
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, lesson_id, title, order_index } = body as {
    id?: string
    lesson_id: string
    title: string
    order_index?: number
  }

  if (!lesson_id || !title) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin phần học (lesson_id, title)", 400)
  }

  let dbResult
  if (id) {
    const { data, error } = await supabase
      .from("study_sections")
      .update({
        lesson_id,
        title,
        order_index: order_index || 1
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) throw error
    dbResult = data
  } else {
    const { data, error } = await supabase
      .from("study_sections")
      .insert({
        lesson_id,
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

// DELETE /api/study/sections?id=section-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID phần học cần xóa", 400)
  }

  const { error } = await supabase.from("study_sections").delete().eq("id", id)
  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
