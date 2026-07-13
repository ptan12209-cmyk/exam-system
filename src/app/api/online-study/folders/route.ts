import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject, isValidOnlineSubjectAny } from "@/lib/online-study-auth"
import { requireSingleDevice } from "@/lib/device-binding"

// GET /api/online-study/folders?subject=math|toan
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const subject = request.nextUrl.searchParams.get("subject")
  if (!subject) {
    throw new ApiError("BAD_REQUEST", "Thiếu tham số môn học (subject)", 400)
  }
  if (!isValidOnlineSubjectAny(subject)) {
    throw new ApiError("BAD_REQUEST", "Mã môn học không hợp lệ", 400)
  }

  await requireSingleDevice(request, createAdminClient(), user.id)

  // Defense in depth — also enforced by RLS after migration
  await requireOnlineSubject(supabase, user.id, subject)

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

// DELETE /api/online-study/folders?id=uuid | ?ids=a,b,c | body { ids: string[] }
// CASCADE: subfolders + lessons under deleted folders are removed by FK.
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const ids = await parseDeleteIds(request)
  if (ids.length === 0) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID thư mục cần xóa", 400)
  }
  if (ids.length > 100) {
    throw new ApiError("BAD_REQUEST", "Tối đa 100 thư mục mỗi lần xóa", 400)
  }

  const { error, count } = await supabase
    .from("online_folders")
    .delete({ count: "exact" })
    .in("id", ids)

  if (error) throw error

  return NextResponse.json(
    successResponse({ success: true, deleted: count ?? ids.length, ids })
  )
}

async function parseDeleteIds(request: NextRequest): Promise<string[]> {
  const single = request.nextUrl.searchParams.get("id")
  const multi = request.nextUrl.searchParams.get("ids")
  if (single?.trim()) return [single.trim()]
  if (multi?.trim()) {
    return multi
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  try {
    const body = await request.json()
    if (Array.isArray(body?.ids)) {
      return body.ids
        .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x: string) => x.trim())
    }
    if (typeof body?.id === "string" && body.id.trim()) return [body.id.trim()]
  } catch {
    /* no body */
  }
  return []
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const DELETE = withErrorHandler(handleDELETE)
