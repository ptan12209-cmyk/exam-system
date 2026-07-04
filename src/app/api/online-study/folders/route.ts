import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

// GET /api/online-study/folders?subject=math
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // require student, online_student, teacher, or admin to access
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const subject = request.nextUrl.searchParams.get("subject")
  if (!subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số môn học (subject)", 400)
  }

  const { data: folders, error } = await supabase
    .from("online_folders")
    .select("*")
    .eq("subject", subject)
    .order("order_index", { ascending: true })

  if (error) throw error

  return NextResponse.json(successResponse(folders || []))
}

// POST /api/online-study/folders
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { id, name, parent_id, subject, order_index } = body as {
    id?: string
    name: string
    parent_id?: string | null
    subject: string
    order_index?: number
  }

  if (!name || !subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu thông tin bắt buộc (name, subject)", 400)
  }

  let dbResult
  if (id) {
    // Update existing folder
    const { data, error } = await supabase
      .from("online_folders")
      .update({
        name,
        parent_id: parent_id || null,
        subject,
        order_index: order_index || 1,
        teacher_id: user.id
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    dbResult = data
  } else {
    // Create new folder
    const { data, error } = await supabase
      .from("online_folders")
      .insert({
        name,
        parent_id: parent_id || null,
        subject,
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

// DELETE /api/online-study/folders?id=folder-uuid
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID thư mục cần xóa", 400)
  }

  const { error } = await supabase
    .from("online_folders")
    .delete()
    .eq("id", id)

  if (error) throw error

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
