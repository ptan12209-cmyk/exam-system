import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/online-study/lessons?folder_id=uuid OR ?subject=math
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const folderId = request.nextUrl.searchParams.get("folder_id")
  const subject = request.nextUrl.searchParams.get("subject")

  if (!folderId && !subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số folder_id hoặc subject", 400)
  }

  let lessonsData = []

  if (folderId) {
    const { data: lessons, error } = await supabase
      .from("online_lessons")
      .select("*")
      .eq("folder_id", folderId)
      .order("order_index", { ascending: true })

    if (error) throw error
    lessonsData = lessons || []
  } else if (subject) {
    // Get all lessons for all folders in the subject
    const { data: lessons, error } = await supabase
      .from("online_lessons")
      .select(`
        *,
        online_folders!inner(subject)
      `)
      .eq("online_folders.subject", subject)
      .order("order_index", { ascending: true })

    if (error) throw error
    lessonsData = lessons || []
  }

  return NextResponse.json(successResponse(lessonsData))
}

// POST /api/online-study/lessons
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, folder_id, title, description, video_url, document_url, order_index } = body as {
    id?: string
    folder_id: string
    title: string
    description?: string | null
    video_url?: string | null
    document_url?: string | null
    order_index?: number
  }

  if (!folder_id || !title) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (folder_id, title)", 400)
  }

  let dbResult
  if (id) {
    // Update existing lesson
    const { data, error } = await supabase
      .from("online_lessons")
      .update({
        folder_id,
        title,
        description: description || null,
        video_url: video_url || null,
        document_url: document_url || null,
        order_index: order_index || 1,
        teacher_id: user.id
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    dbResult = data
  } else {
    // Create new lesson
    const { data, error } = await supabase
      .from("online_lessons")
      .insert({
        folder_id,
        title,
        description: description || null,
        video_url: video_url || null,
        document_url: document_url || null,
        order_index: order_index || 1,
        teacher_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    dbResult = data
  }

  return NextResponse.json(successResponse(dbResult))
}

// DELETE /api/online-study/lessons?id=lesson-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID bài học cần xóa", 400)
  }

  const { error } = await supabase
    .from("online_lessons")
    .delete()
    .eq("id", id)

  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
