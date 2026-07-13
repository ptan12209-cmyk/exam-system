import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject } from "@/lib/online-study-auth"
import { buildPlaybackPayload, type LessonMediaRow } from "@/lib/lesson-media"
import { signDocumentList } from "@/lib/document-sign"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { requireSingleDevice } from "@/lib/device-binding"

/**
 * GET /api/online-study/lessons/[id]/playback
 * Entitled students only — returns video/document URLs (optionally Bunny-signed).
 * V3: media rows loaded via service role after entitlement (students have no table SELECT).
 */
async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["student", "online_student", "teacher", "admin"])

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`playback:${user.id}:${ip}`, 60, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 60,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const { id: lessonId } = await context.params
  if (!lessonId) {
    throw new ApiError("BAD_REQUEST", "Thiếu lesson id", 400)
  }

  // Staff can read via user JWT; students need admin after entitlement
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

  // V4b: short-lived signed URLs for Supabase Storage documents
  const admin = createAdminClient()
  const signedDocs = await signDocumentList(admin, payload.documents, 3600)
  const responsePayload = {
    ...payload,
    documents: signedDocs.documents.map(({ title, url }) => ({ title, url })),
    document_expires_in: signedDocs.expires_in,
    expires_in: payload.expires_in ?? signedDocs.expires_in,
  }

  // Fire-and-forget audit (service role)
  try {
    void admin.from("content_access_logs").insert({
      user_id: user.id,
      lesson_id: lessonId,
      action: "playback",
      ip,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) || null,
      meta: {
        subject: folderSubject,
        video_count: responsePayload.videos.length,
        document_count: responsePayload.documents.length,
        docs_signed: signedDocs.any_signed,
      },
    })
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json(successResponse(responsePayload))
}

export const GET = withErrorHandler(handleGET)
