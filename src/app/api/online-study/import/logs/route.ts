import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"

/**
 * GET /api/online-study/import/logs?limit=50
 * Staff-only: recent machine import log rows for ops debugging.
 */
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const limitRaw = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("online_import_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    // Table may not exist yet on older envs
    if (
      error.message?.includes("does not exist") ||
      error.message?.includes("relation") ||
      error.code === "42P01"
    ) {
      return NextResponse.json(successResponse({ logs: [], note: "table_missing" }))
    }
    throw new ApiError("DB_ERROR", error.message, 500)
  }

  return NextResponse.json(successResponse({ logs: data || [] }))
}

export const GET = withErrorHandler(handleGET)
