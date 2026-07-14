import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { verifyOtpCode } from "@/lib/email-otp"
import { isEmailVerified } from "@/lib/email-verify"

async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rate = await checkRateLimit(`otp-verify:${ip}`, 20, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 20,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified_at, account_source, role")
    .eq("id", user.id)
    .single()

  if (profile && isEmailVerified(profile)) {
    return NextResponse.json(
      successResponse({ verified: true, message: "Email đã được xác thực" })
    )
  }

  const body = await request.json().catch(() => ({}))
  const code = typeof body.code === "string" ? body.code : ""

  await verifyOtpCode(admin, { userId: user.id, code })

  return NextResponse.json(
    successResponse({ verified: true, message: "Xác thực email thành công" })
  )
}

export const POST = withErrorHandler(handlePOST)
