import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/study/lessons?chapter_id=chapter-uuid
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  await requireAuth(supabase)
  
  const chapterId = request.nextUrl.searchParams.get("chapter_id")
  if (!chapterId) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số mã chương (chapter_id)", 400)
  }

  const { data: lessons, error } = await supabase
    .from("study_lessons")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true })

  if (error) throw error

  return NextResponse.json(successResponse(lessons || []))
}

// POST /api/study/lessons
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, chapter_id, title, order_index } = body as {
    id?: string
    chapter_id: string
    title: string
    order_index?: number
  }

  if (!chapter_id || !title) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bài học (chapter_id, title)", 400)
  }

  let dbResult
  if (id) {
    const { data, error } = await supabase
      .from("study_lessons")
      .update({
        chapter_id,
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
      .from("study_lessons")
      .insert({
        chapter_id,
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

// DELETE /api/study/lessons?id=lesson-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID bài học cần xóa", 400)
  }

  const { error } = await supabase.from("study_lessons").delete().eq("id", id)
  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
