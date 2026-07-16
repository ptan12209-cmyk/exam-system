import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject } from "@/lib/online-study-auth"
import { buildPlaybackPayload, type LessonMediaRow } from "@/lib/lesson-media"
import { maybeSignDocumentUrl } from "@/lib/document-sign"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { requireSingleDevice } from "@/lib/device-binding"
import {
  fetchDocumentUpstream,
  isBunnyCdnUrl,
  bunnyStorageConfigured,
} from "@/lib/bunny-storage"

/** Large PDFs via Storage proxy */
export const maxDuration = 60

/**
 * GET /api/online-study/lessons/[id]/document?index=0
 *   &proxy=1 | &preview=1 | &redirect=1  → stream file bytes (inline PDF)
 *   (default) → JSON { title, url } where url is same-origin proxy for Bunny CDN
 *
 * Bunny pull zone DNS may fail; prefer Storage proxy when configured.
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
  const proxy =
    request.nextUrl.searchParams.get("proxy") === "1" ||
    request.nextUrl.searchParams.get("preview") === "1" ||
    redirect

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

  const admin = createAdminClient()
  const signed = await maybeSignDocumentUrl(admin, doc.url, 1800)
  const finalUrl = signed.url

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
        proxy,
      },
    })
  } catch {
    /* ignore */
  }

  // Stream bytes (preview / open) — bypass broken CDN hostname via Storage when possible
  if (proxy) {
    const { res, via } = await fetchDocumentUpstream(safeUrl.toString())
    if (!res || !res.ok || !res.body) {
      throw new ApiError(
        "BAD_GATEWAY",
        bunnyStorageConfigured()
          ? "Không tải được tài liệu từ Bunny Storage. Kiểm tra path/key."
          : "Không tải được tài liệu. CDN có thể lỗi DNS — cấu hình BUNNY_STORAGE_* trên server.",
        502
      )
    }

    const rawName = String(doc.title || "tai-lieu.pdf")
    const safeName = rawName.replace(/[^\w.\u00C0-\u1EF9\s()-]/gi, "_").slice(0, 120)
    const upstreamType = res.headers.get("content-type") || ""
    const contentType =
      upstreamType.includes("pdf") || /\.pdf$/i.test(safeName)
        ? "application/pdf"
        : upstreamType || "application/octet-stream"

    const headers = new Headers()
    headers.set("Content-Type", contentType)
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`
    )
    headers.set("Cache-Control", "private, max-age=120")
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("X-Doc-Via", via)
    // Allow same-origin iframe preview (overrides site-wide DENY when possible)
    headers.set("X-Frame-Options", "SAMEORIGIN")
    headers.set("Content-Security-Policy", "frame-ancestors 'self'")
    const len = res.headers.get("content-length")
    if (len) headers.set("Content-Length", len)

    return new NextResponse(res.body, { status: 200, headers })
  }

  // JSON: prefer same-origin proxy URL for Bunny so clients never hit broken pull-zone DNS
  const preferProxy = isBunnyCdnUrl(safeUrl.toString()) || bunnyStorageConfigured()
  const clientUrl = preferProxy
    ? `/api/online-study/lessons/${lessonId}/document?index=${index}&proxy=1`
    : safeUrl.toString()

  return NextResponse.json(
    successResponse({
      title: doc.title,
      url: clientUrl,
      absolute_url: safeUrl.toString(),
      index,
      signed: signed.signed,
      expires_in: signed.expires_in,
      proxy_recommended: preferProxy,
    })
  )
}

export const GET = withErrorHandler(handleGET)
