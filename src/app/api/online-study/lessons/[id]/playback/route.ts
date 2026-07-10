import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { requireOnlineSubject } from "@/lib/online-study-auth"
import { buildPlaybackPayload, type LessonMediaRow } from "@/lib/lesson-media"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

/**
 * GET /api/online-study/lessons/[id]/playback
 * Entitled students only — returns video/document URLs (optionally Bunny-signed).
 * Catalog list must not expose these URLs.
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

  const { data: lesson, error } = await supabase
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

  // Fire-and-forget audit (service role)
  try {
    const admin = createAdminClient()
    void admin.from("content_access_logs").insert({
      user_id: user.id,
      lesson_id: lessonId,
      action: "playback",
      ip,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) || null,
      meta: {
        subject: folderSubject,
        video_count: payload.videos.length,
        document_count: payload.documents.length,
      },
    })
  } catch {
    /* table may not exist yet */
  }

  return NextResponse.json(successResponse(payload))
}

export const GET = withErrorHandler(handleGET)
