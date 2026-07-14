import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { verifyTurnstileToken } from "@/lib/turnstile-utils"
import { createAndSendOtp } from "@/lib/email-otp"

const MIN_PASSWORD_LENGTH = 8

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// POST /api/auth/register — public signup; role always forced to student
async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rate = await checkRateLimit(`register:${ip}`, 5, 60)
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
  const password = typeof body.password === "string" ? body.password : ""
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
  const phone = typeof body.phone === "string" ? body.phone.trim() : null
  const studentClass = typeof body.studentClass === "string" ? body.studentClass.trim() : null
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : null

  // Ignore any client-supplied role — always student
  if (!email || !isValidEmail(email)) {
    throw new ApiError("BAD_REQUEST", "Email không hợp lệ", 400)
  }
  if (!fullName || fullName.length < 2) {
    throw new ApiError("BAD_REQUEST", "Vui lòng nhập họ tên", 400)
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      "BAD_REQUEST",
      `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`,
      400
    )
  }

  const captchaOk = await verifyTurnstileToken(captchaToken)
  if (!captchaOk) {
    throw new ApiError("CAPTCHA_FAILED", "Xác minh CAPTCHA thất bại. Vui lòng thử lại.", 400)
  }

  const adminSupabase = createAdminClient()

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      full_name: fullName,
    },
  })

  if (authError || !authData.user) {
    const msg = authError?.message || "Không thể tạo tài khoản"
    // Soften duplicate email message
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      throw new ApiError("EMAIL_EXISTS", "Email đã được đăng ký", 400)
    }
    throw new ApiError("BAD_REQUEST", msg, 400)
  }

  const userId = authData.user.id

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: "student",
        full_name: fullName,
        class: studentClass || null,
        phone: phone || null,
        email,
        account_source: "self_register",
        email_verified_at: null,
      },
      { onConflict: "id" }
    )

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(userId)
    throw profileError
  }

  // OTP after register (non-blocking if email provider misconfigured in dev)
  const otpResult = await createAndSendOtp(adminSupabase, {
    userId,
    email,
    fullName,
  })

  return NextResponse.json(
    successResponse({
      userId,
      email,
      role: "student",
      needsVerification: true,
      otpSent: otpResult.ok,
      message: otpResult.ok
        ? "Đăng ký thành công. Em đã nhận mã OTP 4 số qua email — vui lòng xác thực trong 5 ngày."
        : "Đăng ký thành công. Không gửi được OTP lúc này; đăng nhập rồi bấm Gửi lại mã trên trang xác thực.",
    })
  )
}

export const POST = withErrorHandler(handlePOST)
