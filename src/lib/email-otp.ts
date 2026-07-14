import { createHash, randomInt } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ApiError } from "@/lib/api-utils"
import { sendOtpEmail } from "@/lib/email"

const OTP_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000

function getPepper(): string {
  return process.env.OTP_PEPPER || process.env.RESEND_API_KEY || "dev-otp-pepper-change-me"
}

export function generateOtpCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0")
}

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(`${code}:${getPepper()}`).digest("hex")
}

export async function createAndSendOtp(
  admin: SupabaseClient,
  params: { userId: string; email: string; fullName?: string | null }
): Promise<{ ok: true } | { ok: false; error: string; retryAfterSec?: number }> {
  const { data: latest } = await admin
    .from("email_otps")
    .select("created_at")
    .eq("user_id", params.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest?.created_at) {
    const age = Date.now() - new Date(latest.created_at).getTime()
    if (age < RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((RESEND_COOLDOWN_MS - age) / 1000)
      return { ok: false, error: `Vui lòng đợi ${retryAfterSec}s trước khi gửi lại mã`, retryAfterSec }
    }
  }

  const code = generateOtpCode()
  const codeHash = hashOtpCode(code)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  const { error: insertError } = await admin.from("email_otps").insert({
    user_id: params.userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error("[email-otp] insert failed", insertError)
    return { ok: false, error: "Không lưu được mã OTP" }
  }

  const sent = await sendOtpEmail({
    to: params.email,
    code,
    fullName: params.fullName || undefined,
  })

  if (!sent.success) {
    console.error("[email-otp] send failed", sent.error)
    // Still ok for dev if Resend not configured — code is in server logs
    if (!process.env.RESEND_API_KEY) {
      console.warn(`[email-otp] DEV OTP for ${params.email}: ${code}`)
      return { ok: true }
    }
    return { ok: false, error: sent.error || "Không gửi được email OTP" }
  }

  return { ok: true }
}

export async function verifyOtpCode(
  admin: SupabaseClient,
  params: { userId: string; code: string }
): Promise<void> {
  const code = params.code.replace(/\D/g, "").slice(0, 4)
  if (code.length !== 4) {
    throw new ApiError("BAD_REQUEST", "Mã OTP phải gồm 4 chữ số", 400)
  }

  const { data: row, error } = await admin
    .from("email_otps")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("user_id", params.userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !row) {
    throw new ApiError("OTP_INVALID", "Không có mã OTP hợp lệ. Vui lòng gửi lại mã.", 400)
  }

  if (row.consumed_at) {
    throw new ApiError("OTP_INVALID", "Mã OTP đã được sử dụng", 400)
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new ApiError("OTP_EXPIRED", "Mã OTP đã hết hạn. Vui lòng gửi lại mã.", 400)
  }

  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
    throw new ApiError("OTP_LOCKED", "Đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.", 400)
  }

  const expected = hashOtpCode(code)
  if (expected !== row.code_hash) {
    await admin
      .from("email_otps")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id)
    throw new ApiError("OTP_INVALID", "Mã OTP không đúng", 400)
  }

  const now = new Date().toISOString()
  await admin.from("email_otps").update({ consumed_at: now }).eq("id", row.id)

  const { error: profileError } = await admin
    .from("profiles")
    .update({ email_verified_at: now })
    .eq("id", params.userId)

  if (profileError) {
    console.error("[email-otp] profile update failed", profileError)
    throw new ApiError("INTERNAL", "Xác thực thành công nhưng không cập nhật hồ sơ", 500)
  }
}
