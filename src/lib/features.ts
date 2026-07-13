/**
 * Product feature flags — flip without deleting code paths.
 */

/** Gamification UI is locked; backend stats may still update silently. */
export const GAMIFICATION_ENABLED = false

/**
 * Public self-registration. Locked until reopen date so visitors
 * can only overview courses/landing before buy flow reopens.
 * Reminder: docs/REMINDER_OPEN_REGISTRATION_2026-07-29.md
 */
export const REGISTRATION_ENABLED = false

/** ISO date (local VN calendar): reopen self-registration */
export const REGISTRATION_REOPEN_DATE = "2026-07-29"

/**
 * 1 thiết bị / 1 tài khoản (học viên).
 * Login máy mới → ghi đè binding, máy cũ bị đá khi verify.
 * Teacher/admin được miễn.
 * Cần chạy migrations/migration-single-device-binding.sql trên Supabase.
 */
export const SINGLE_DEVICE_ENABLED = true

/** Routes hidden / redirected while gamification is locked */
export const GAMIFICATION_ROUTE_PREFIXES = [
  "/student/achievements",
  "/student/rewards",
] as const

export function isGamificationRoute(pathname: string): boolean {
  return GAMIFICATION_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isRegistrationOpen(): boolean {
  if (REGISTRATION_ENABLED) return true
  // Auto-open after reopen date (inclusive, Vietnam calendar day)
  try {
    const reopen = new Date(`${REGISTRATION_REOPEN_DATE}T00:00:00+07:00`)
    return Date.now() >= reopen.getTime()
  } catch {
    return REGISTRATION_ENABLED
  }
}
