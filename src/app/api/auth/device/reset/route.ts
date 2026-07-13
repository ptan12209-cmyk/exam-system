import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { clearDeviceBinding } from "@/lib/device-binding"

/**
 * POST /api/auth/device/reset
 * Teacher: clear student device binding so they can login on a new machine.
 */
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const teacher = await requireAuth(supabase)
  await requireRole(supabase, teacher.id, ["teacher", "admin"])

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`device-reset:${teacher.id}:${ip}`, 30, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 30,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  let body: { userId?: string } = {}
  try {
    body = await request.json()
  } catch {
    throw new ApiError("BAD_REQUEST", "Body JSON không hợp lệ", 400)
  }

  const userId = body.userId?.trim()
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new ApiError("BAD_REQUEST", "userId không hợp lệ", 400)
  }

  const admin = createAdminClient()
  await clearDeviceBinding(admin, userId)

  return NextResponse.json(
    successResponse({ reset: true, userId })
  )
}

export const POST = withErrorHandler(handlePOST)
