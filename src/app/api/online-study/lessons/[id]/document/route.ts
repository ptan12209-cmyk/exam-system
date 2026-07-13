import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject } from "@/lib/online-study-auth"
import { buildPlaybackPayload, type LessonMediaRow } from "@/lib/lesson-media"
import { maybeSignDocumentUrl } from "@/lib/document-sign"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { requireSingleDevice } from "@/lib/device-binding"

/**
 * GET /api/online-study/lessons/[id]/document?index=0
 * Entitled open of a lesson document URL + audit log.
 * Prefer this over raw doc URLs when linking from the study UI.
 */
async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`doc:${user.id}:${ip}`, 60, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 60,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const { id: lessonId } = await context.params
  const indexRaw = request.nextUrl.searchParams.get("index")
  const index = Math.max(0, parseInt(indexRaw || "0", 10) || 0)
  const redirect = request.nextUrl.searchParams.get("redirect") === "1"

  if (!lessonId) {
    throw new ApiError("BAD_REQUEST", "Thiếu lesson id", 400)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  const isStaff = profile?.role === "teacher" || profile?.role === "admin"
  const dataClient = isStaff ? supabase : createAdminClient()

  if (!isStaff) {
    await requireSingleDevice(request, createAdminClient(), user.id, {
      role: profile?.role,
    })
  }

  const { data: lesson, error } = await dataClient
    .from("online_lessons")
    .select(
      `
      id, folder_id, title, description, order_index,
      video_url, document_url, videos, documents,
      online_folders!inner(id, subject)
    `
    )
    .eq("id", lessonId)
    .maybeSingle()

  if (error) throw error
  if (!lesson) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy bài học", 404)
  }

  const folderSubject =
    (lesson as { online_folders?: { subject?: string } }).online_folders?.subject
  if (!folderSubject) {
    throw new ApiError("NOT_FOUND", "Không xác định được môn học", 404)
  }

  await requireOnlineSubject(supabase, user.id, folderSubject)

  const payload = buildPlaybackPayload(lesson as unknown as LessonMediaRow)
  const doc = payload.documents[index]
  if (!doc?.url) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy tài liệu", 404)
  }

  // V4b: re-sign Supabase Storage URL at open time (short TTL)
  const admin = createAdminClient()
  const signed = await maybeSignDocumentUrl(admin, doc.url, 1800)
  const finalUrl = signed.url

  // Only allow http(s) redirects (block javascript: etc.)
  let safeUrl: URL
  try {
    safeUrl = new URL(finalUrl)
    if (safeUrl.protocol !== "http:" && safeUrl.protocol !== "https:") {
      throw new Error("bad protocol")
    }
  } catch {
    throw new ApiError("BAD_REQUEST", "URL tài liệu không hợp lệ", 400)
  }

  try {
    void admin.from("content_access_logs").insert({
      user_id: user.id,
      lesson_id: lessonId,
      action: "document",
      ip,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) || null,
      meta: {
        subject: folderSubject,
        index,
        title: doc.title,
        signed: signed.signed,
      },
    })
  } catch {
    /* ignore */
  }

  if (redirect) {
    return NextResponse.redirect(safeUrl.toString(), 302)
  }

  return NextResponse.json(
    successResponse({
      title: doc.title,
      url: safeUrl.toString(),
      index,
      signed: signed.signed,
      expires_in: signed.expires_in,
    })
  )
}

export const GET = withErrorHandler(handleGET)
