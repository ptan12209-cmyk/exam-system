/**
 * Product feature flags — flip without deleting code paths.
 * Gamification UI is locked; backend stats may still update silently.
 */
export const GAMIFICATION_ENABLED = false

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
