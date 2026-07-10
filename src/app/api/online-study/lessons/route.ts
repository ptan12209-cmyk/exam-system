import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject, isValidOnlineSubjectAny } from "@/lib/online-study-auth"

// GET /api/online-study/lessons?folder_id=uuid OR ?subject=math|toan
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const folderId = request.nextUrl.searchParams.get("folder_id")
  const subject = request.nextUrl.searchParams.get("subject")

  if (!folderId && !subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số folder_id hoặc subject", 400)
  }

  // Reject unscoped lesson list (was used to enumerate all content)
  if (!folderId && !subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số folder_id hoặc subject", 400)
  }

  let lessonsData = []

  if (folderId) {
    const { data: folder, error: folderError } = await supabase
      .from("online_folders")
      .select("id, subject")
      .eq("id", folderId)
      .maybeSingle()

    if (folderError) throw folderError
    if (!folder) {
      throw new ApiError("NOT_FOUND", "Không tìm thấy thư mục", 404)
    }

    await requireOnlineSubject(supabase, user.id, folder.subject)

    const { data: lessons, error } = await supabase
      .from("online_lessons")
      .select("*")
      .eq("folder_id", folderId)
      .order("order_index", { ascending: true })

    if (error) throw error
    lessonsData = lessons || []
  } else if (subject) {
    if (!isValidOnlineSubjectAny(subject)) {
      throw new ApiError("BAD_REQUEST", "Mã môn học không hợp lệ", 400)
    }
    await requireOnlineSubject(supabase, user.id, subject)

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
  const { id, folder_id, title, description, video_url, document_url, order_index, videos, documents } = body as {
    id?: string
    folder_id: string
    title: string
    description?: string | null
    video_url?: string | null
    document_url?: string | null
    order_index?: number
    videos?: Array<{ title: string; url: string }>
    documents?: Array<{ title: string; url: string }>
  }

  if (!folder_id || !title) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (folder_id, title)", 400)
  }

  // Backwards compatibility logic
  let finalVideos = videos || []
  if (finalVideos.length === 0 && video_url) {
    finalVideos = [{ title: "Video bài học", url: video_url }]
  }

  let finalDocuments = documents || []
  if (finalDocuments.length === 0 && document_url) {
    finalDocuments = [{ title: "Tài liệu bài học", url: document_url }]
  }

  // Primary video/document urls to keep old columns in sync
  const primaryVideoUrl = finalVideos[0]?.url || video_url || null
  const primaryDocumentUrl = finalDocuments[0]?.url || document_url || null

  let dbResult
  if (id) {
    // Update existing lesson
    const { data, error } = await supabase
      .from("online_lessons")
      .update({
        folder_id,
        title,
        description: description || null,
        video_url: primaryVideoUrl,
        document_url: primaryDocumentUrl,
        videos: finalVideos,
        documents: finalDocuments,
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
        video_url: primaryVideoUrl,
        document_url: primaryDocumentUrl,
        videos: finalVideos,
        documents: finalDocuments,
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
