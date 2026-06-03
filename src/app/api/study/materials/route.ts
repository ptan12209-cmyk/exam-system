import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/study/materials?lesson_id=lesson-uuid
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  await requireAuth(supabase)
  
  const lessonId = request.nextUrl.searchParams.get("lesson_id")
  if (!lessonId) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số bài học (lesson_id)", 400)
  }

  const { data: materials, error } = await supabase
    .from("study_materials")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return NextResponse.json(successResponse(materials || []))
}

// POST /api/study/materials
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, lesson_id, title, type, url, description } = body as {
    id?: string
    lesson_id: string
    title: string
    type: "video" | "document"
    url: string
    description?: string
  }

  if (!lesson_id || !title || !type || !url) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (lesson_id, title, type, url)", 400)
  }

  if (type !== "video" && type !== "document") {
    throw new ApiError("BAD_REQUEST", "Loại học liệu không hợp lệ (phải là video hoặc document)", 400)
  }

  let finalUrl = url.trim()
  if (type === "video") {
    // Standardize YouTube URLs into embed code formats for iframe safety
    // Supports: https://www.youtube.com/watch?v=dQw4w9WgXcQ, https://youtu.be/dQw4w9WgXcQ, etc.
    const ytMatch = finalUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    if (ytMatch) {
      finalUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
    }
  }

  let dbResult
  if (id) {
    const { data, error } = await supabase
      .from("study_materials")
      .update({
        lesson_id,
        title,
        type,
        url: finalUrl,
        description: description || null
      })
      .eq("id", id)
      .select()
      .single()
    
    if (error) throw error
    dbResult = data
  } else {
    const { data, error } = await supabase
      .from("study_materials")
      .insert({
        lesson_id,
        title,
        type,
        url: finalUrl,
        description: description || null,
        uploader_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    dbResult = data
  }

  return NextResponse.json(successResponse(dbResult))
}

// DELETE /api/study/materials?id=material-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID học liệu cần xóa", 400)
  }

  const { error } = await supabase.from("study_materials").delete().eq("id", id)
  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
