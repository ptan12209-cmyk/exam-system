import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { detectAccessAnomalies } from "@/lib/access-anomaly"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

/**
 * GET /api/online-study/access-logs
 * Teacher/admin: recent content access + V4c anomaly summary.
 *
 * Query:
 *   limit=50 (max 200)
 *   offset=0
 *   user_id=
 *   lesson_id=
 *   action=playback|document
 *   hours=24 (for anomalies window, default 24, max 168)
 */
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`access-logs:${user.id}:${ip}`, 30, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 30,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const sp = request.nextUrl.searchParams
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1), 200)
  const offset = Math.max(parseInt(sp.get("offset") || "0", 10) || 0, 0)
  const filterUser = sp.get("user_id")
  const filterLesson = sp.get("lesson_id")
  const filterAction = sp.get("action")
  const hours = Math.min(Math.max(parseInt(sp.get("hours") || "24", 10) || 24, 1), 168)

  const admin = createAdminClient()
  const sinceIso = new Date(Date.now() - hours * 3600_000).toISOString()

  // Recent window for anomaly scan (up to 1000 rows)
  const anomalyQuery = admin
    .from("content_access_logs")
    .select("user_id, ip, action, created_at, lesson_id")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1000)

  const { data: anomalyRows, error: anomalyErr } = await anomalyQuery
  if (anomalyErr) {
    // Table missing
    if (
      anomalyErr.message?.includes("does not exist") ||
      anomalyErr.code === "42P01"
    ) {
      throw new ApiError(
        "NOT_READY",
        "Chưa có bảng content_access_logs — chạy migration-content-access-logs.sql",
        503
      )
    }
    throw anomalyErr
  }

  const anomalies = detectAccessAnomalies(anomalyRows || [], {
    windowHours: hours,
  })

  // Paginated list with joins
  let listQuery = admin
    .from("content_access_logs")
    .select(
      `
      id, user_id, lesson_id, action, ip, user_agent, meta, created_at,
      profiles:user_id ( id, full_name, email ),
      online_lessons:lesson_id ( id, title )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filterUser) listQuery = listQuery.eq("user_id", filterUser)
  if (filterLesson) listQuery = listQuery.eq("lesson_id", filterLesson)
  if (filterAction === "playback" || filterAction === "document") {
    listQuery = listQuery.eq("action", filterAction)
  }

  const { data: logs, error: listErr, count } = await listQuery
  if (listErr) throw listErr

  // Enrich anomalies with profile names
  const anomalyUserIds = Array.from(new Set(anomalies.map((a) => a.user_id)))
  const profileMap: Record<string, { full_name: string | null; email: string | null }> = {}
  if (anomalyUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", anomalyUserIds)
    for (const p of profiles || []) {
      profileMap[p.id] = { full_name: p.full_name, email: p.email }
    }
  }

  const anomaliesEnriched = anomalies.map((a) => ({
    ...a,
    user: profileMap[a.user_id] || null,
  }))

  return NextResponse.json(
    successResponse({
      logs: logs || [],
      total: count ?? (logs || []).length,
      limit,
      offset,
      hours,
      anomalies: anomaliesEnriched,
      anomaly_count: anomaliesEnriched.length,
    })
  )
}

export const GET = withErrorHandler(handleGET)
