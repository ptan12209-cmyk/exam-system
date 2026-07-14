import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { createAndSendOtp } from "@/lib/email-otp"
import { isEmailVerified } from "@/lib/email-verify"

async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rate = await checkRateLimit(`otp-send:${ip}`, 10, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 10,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const supabase = await createClient()
  const user = await requireAuth(supabase)
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name, email_verified_at, account_source, role, created_at")
    .eq("id", user.id)
    .single()

  if (!profile) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy hồ sơ", 404)
  }

  if (isEmailVerified(profile)) {
    return NextResponse.json(
      successResponse({ alreadyVerified: true, message: "Email đã được xác thực" })
    )
  }

  const email = (profile.email || user.email || "").toLowerCase().trim()
  if (!email) {
    throw new ApiError("BAD_REQUEST", "Tài khoản chưa có email", 400)
  }

  const result = await createAndSendOtp(admin, {
    userId: user.id,
    email,
    fullName: profile.full_name,
  })

  if (!result.ok) {
    throw new ApiError("OTP_SEND_FAILED", result.error, 429)
  }

  return NextResponse.json(
    successResponse({ sent: true, message: "Đã gửi mã OTP 4 số tới email của em" })
  )
}

export const POST = withErrorHandler(handlePOST)
