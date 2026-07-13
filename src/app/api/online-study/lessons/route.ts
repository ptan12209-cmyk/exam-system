import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject, isValidOnlineSubjectAny } from "@/lib/online-study-auth"
import {
  sanitizeLessonForCatalog,
  normalizeMediaItemsForStorage,
  normalizeMediaUrlForStorage,
  type LessonMediaRow,
  type MediaItem,
} from "@/lib/lesson-media"

/**
 * Supabase/PostgREST defaults to max 1000 rows per request.
 * Teacher UI used to load ?subject=math once → only first 1000 lessons
 * (by order_index). Videos imported later (high order_index) never appeared
 * even when the teacher opened the correct folder.
 */
const PAGE_SIZE = 1000

type LessonQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: LessonMediaRow[] | null; error: { message?: string } | null }>
}

async function fetchAllLessonPages(build: () => LessonQuery): Promise<LessonMediaRow[]> {
  const all: LessonMediaRow[] = []
  let from = 0
  // Hard cap: 50k lessons per subject (50 pages) — safety against runaway loops
  for (let page = 0; page < 50; page++) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data || []) as LessonMediaRow[]
    if (!rows.length) break
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

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

  // Role: students get catalog without media URLs; teachers get full rows
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  const isStaff = profile?.role === "teacher" || profile?.role === "admin"

  if (!isStaff) {
    const { requireSingleDevice } = await import("@/lib/device-binding")
    await requireSingleDevice(request, createAdminClient(), user.id, {
      role: profile?.role,
    })
  }

  // V3: students cannot SELECT online_lessons (RLS). After entitlement, use admin.
  const dataClient = isStaff ? supabase : createAdminClient()

  let lessonsData: LessonMediaRow[] = []

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

    // Folder scope is small — still paginate for safety
    lessonsData = await fetchAllLessonPages(() =>
      dataClient
        .from("online_lessons")
        .select("*")
        .eq("folder_id", folderId)
        .order("order_index", { ascending: true }) as unknown as LessonQuery
    )
  } else if (subject) {
    if (!isValidOnlineSubjectAny(subject)) {
      throw new ApiError("BAD_REQUEST", "Mã môn học không hợp lệ", 400)
    }
    await requireOnlineSubject(supabase, user.id, subject)

    lessonsData = await fetchAllLessonPages(() =>
      dataClient
        .from("online_lessons")
        .select(
          `
        *,
        online_folders!inner(subject)
      `
        )
        .eq("online_folders.subject", subject)
        .order("order_index", { ascending: true }) as unknown as LessonQuery
    )
  }

  if (!isStaff) {
    return NextResponse.json(
      successResponse(lessonsData.map((l) => sanitizeLessonForCatalog(l)))
    )
  }

  return NextResponse.json(successResponse(lessonsData))
}

// POST /api/online-study/lessons
// - create/update lesson
// - bulk move: { ids: string[], folder_id, action?: "move" }
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()

  // Bulk move lessons to a folder
  if (Array.isArray(body.ids) && body.folder_id && (body.action === "move" || !body.title)) {
    const folder_id = String(body.folder_id)
    const ids = (body.ids as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim())
    if (ids.length === 0) {
      throw new ApiError("BAD_REQUEST", "Thiếu danh sách bài cần chuyển", 400)
    }
    if (ids.length > 200) {
      throw new ApiError("BAD_REQUEST", "Tối đa 200 bài mỗi lần chuyển", 400)
    }
    const { error, count } = await supabase
      .from("online_lessons")
      .update({ folder_id, teacher_id: user.id })
      .in("id", ids)
    if (error) throw error
    return NextResponse.json(
      successResponse({ success: true, moved: count ?? ids.length, folder_id, ids })
    )
  }

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

  // Backwards compatibility + normalize Bunny URLs (strip tokens for re-sign)
  let finalVideos: MediaItem[] = normalizeMediaItemsForStorage(videos || [])
  if (finalVideos.length === 0 && video_url) {
    finalVideos = [
      {
        title: "Video bài học",
        url: normalizeMediaUrlForStorage(video_url),
      },
    ]
  }

  let finalDocuments: MediaItem[] = normalizeMediaItemsForStorage(documents || [])
  if (finalDocuments.length === 0 && document_url) {
    finalDocuments = [
      {
        title: "Tài liệu bài học",
        url: document_url.trim(),
      },
    ]
  }

  // Primary video/document urls to keep old columns in sync
  const primaryVideoUrl = finalVideos[0]?.url || null
  const primaryDocumentUrl = finalDocuments[0]?.url || null

  let dbResult
  if (id) {
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
        teacher_id: user.id,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    dbResult = data
  } else {
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
        teacher_id: user.id,
      })
      .select()
      .single()

    if (error) throw error
    dbResult = data
  }

  return NextResponse.json(successResponse(dbResult))
}

// DELETE /api/online-study/lessons?id=uuid | ?ids=a,b,c | body { ids: string[] }
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const ids = await parseDeleteIds(request)
  if (ids.length === 0) {
    throw new ApiError("BAD_REQUEST", "Thiếu ID bài học cần xóa", 400)
  }
  if (ids.length > 200) {
    throw new ApiError("BAD_REQUEST", "Tối đa 200 bài học mỗi lần xóa", 400)
  }

  const { error, count } = await supabase
    .from("online_lessons")
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
