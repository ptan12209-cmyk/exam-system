import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { SINGLE_DEVICE_ENABLED } from "@/lib/features"
import {
  extractDeviceIdFromRequest,
  getProfileRole,
  verifyDeviceBinding,
} from "@/lib/device-binding"
import { isValidDeviceId } from "@/lib/device-id"

/**
 * POST /api/auth/device/verify
 * Heartbeat: ensure this device is still the sole active binding.
 */
async function handlePOST(request: NextRequest) {
  if (!SINGLE_DEVICE_ENABLED) {
    return NextResponse.json(successResponse({ ok: true, status: "disabled" }))
  }

  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`device-verify:${user.id}:${ip}`, 60, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 60,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  let body: { deviceId?: string; deviceLabel?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const fromBody = body.deviceId?.trim()
  const deviceId =
    (isValidDeviceId(fromBody) ? fromBody : null) ||
    extractDeviceIdFromRequest(request)

  const role = await getProfileRole(supabase, user.id)
  const admin = createAdminClient()
  const result = await verifyDeviceBinding(admin, user.id, deviceId, {
    role,
    autoBindIfMissing: true,
    deviceLabel: body.deviceLabel,
    userAgent: request.headers.get("user-agent"),
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: result.code, message: result.message },
      },
      { status: result.code === "DEVICE_CONFLICT" ? 409 : 403 }
    )
  }

  return NextResponse.json(successResponse(result))
}

export const POST = withErrorHandler(handlePOST)
