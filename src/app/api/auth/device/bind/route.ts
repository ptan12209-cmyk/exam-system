import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { SINGLE_DEVICE_ENABLED } from "@/lib/features"
import {
  bindDevicePrimary,
  getProfileRole,
  isStaffRole,
  isValidDeviceId,
} from "@/lib/device-binding"

/**
 * POST /api/auth/device/bind
 * After login: claim this browser as the sole active device (kicks previous).
 */
async function handlePOST(request: NextRequest) {
  if (!SINGLE_DEVICE_ENABLED) {
    return NextResponse.json(successResponse({ bound: false, skipped: true }))
  }

  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`device-bind:${user.id}:${ip}`, 20, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 20,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const role = await getProfileRole(supabase, user.id)
  if (isStaffRole(role)) {
    return NextResponse.json(
      successResponse({ bound: false, skipped: true, reason: "staff" })
    )
  }

  let body: { deviceId?: string; deviceLabel?: string } = {}
  try {
    body = await request.json()
  } catch {
    throw new ApiError("BAD_REQUEST", "Body JSON không hợp lệ", 400)
  }

  const deviceId = body.deviceId?.trim() || ""
  if (!isValidDeviceId(deviceId)) {
    throw new ApiError("BAD_REQUEST", "Mã thiết bị không hợp lệ", 400)
  }

  const admin = createAdminClient()
  const result = await bindDevicePrimary(admin, user.id, deviceId, {
    deviceLabel: body.deviceLabel,
    userAgent: request.headers.get("user-agent"),
  })

  return NextResponse.json(successResponse(result))
}

export const POST = withErrorHandler(handlePOST)
