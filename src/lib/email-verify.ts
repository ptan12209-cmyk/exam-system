/** App-level email verification rules (OTP after self-register). */

export const EMAIL_VERIFY_GRACE_DAYS = 5

export type AccountSource = "self_register" | "teacher" | "google"

export type VerifyProfileFields = {
  email_verified_at?: string | null
  account_source?: string | null
  created_at?: string | null
  role?: string | null
}

export function isEmailVerified(profile: VerifyProfileFields | null | undefined): boolean {
  if (!profile) return true
  // Staff never gated
  if (profile.role === "teacher" || profile.role === "admin") return true
  const source = profile.account_source || "self_register"
  if (source === "teacher" || source === "google") return true
  return Boolean(profile.email_verified_at)
}

export function getVerificationDeadline(createdAt: string | null | undefined): Date | null {
  if (!createdAt) return null
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + EMAIL_VERIFY_GRACE_DAYS)
  return d
}

/** Days remaining until grace ends (ceil). Negative if overdue. */
export function getGraceDaysRemaining(createdAt: string | null | undefined): number | null {
  const deadline = getVerificationDeadline(createdAt)
  if (!deadline) return null
  const ms = deadline.getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

/** Must hard-block (redirect to verify page). */
export function isVerificationBlocked(profile: VerifyProfileFields | null | undefined): boolean {
  if (isEmailVerified(profile)) return false
  const remaining = getGraceDaysRemaining(profile?.created_at)
  if (remaining === null) return false
  return remaining < 0
}

/** Soft banner while still within grace. */
export function needsVerificationBanner(profile: VerifyProfileFields | null | undefined): boolean {
  if (isEmailVerified(profile)) return false
  const remaining = getGraceDaysRemaining(profile?.created_at)
  if (remaining === null) return true
  return remaining >= 0
}
