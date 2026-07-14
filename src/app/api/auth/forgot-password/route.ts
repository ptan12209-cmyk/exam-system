import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile-utils"

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Always returns generic success to avoid email enumeration. */
async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rate = await checkRateLimit(`forgot-password:${ip}`, 5, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 5,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : null

  if (!email || !isValidEmail(email)) {
    throw new ApiError("BAD_REQUEST", "Email không hợp lệ", 400)
  }

  if (captchaToken) {
    const captchaOk = await verifyTurnstileToken(captchaToken)
    if (!captchaOk) {
      throw new ApiError("CAPTCHA_FAILED", "Xác minh CAPTCHA thất bại", 400)
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin ||
    "http://localhost:3000"

  try {
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    })
  } catch (e) {
    console.error("[forgot-password]", e)
  }

  return NextResponse.json(
    successResponse({
      message:
        "Nếu email tồn tại trong hệ thống, em sẽ nhận link đặt lại mật khẩu trong vài phút.",
    })
  )
}

export const POST = withErrorHandler(handlePOST)
