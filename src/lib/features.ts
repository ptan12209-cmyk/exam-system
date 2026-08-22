/**
 * Product feature flags — flip without deleting code paths.
 */

/** Gamification UI and public APIs are locked for the core-exam product. */
export const GAMIFICATION_ENABLED = false

/**
 * Video lessons, course materials and course checkout are paused while
 * ExamHub focuses on assignments, tests and student management.
 * Keep the implementation in place so it can be re-enabled later.
 */
export const ONLINE_STUDY_ENABLED = false

/**
 * Public student registration for the assignment platform.
 * Teachers remain provisioned separately and cannot self-select that role.
 */
export const REGISTRATION_ENABLED = false

/**
 * 1 thiết bị / 1 tài khoản (học viên).
 * Login máy mới → ghi đè binding, máy cũ bị đá khi verify.
 * Teacher/admin được miễn.
 * Cần chạy migrations/migration-single-device-binding.sql trên Supabase.
 */
export const SINGLE_DEVICE_ENABLED = true

/**
 * Teacher online-study: Bunny security ops checklist.
 * UI also has show/hide (localStorage). Set false to remove entirely.
 */
export const BUNNY_SECURITY_CHECKLIST_ENABLED = false

/** Realtime competitive arena (student lobby + teacher rooms). */
export const ARENA_ENABLED = false

/** Weekly teaching / student timetables. */
export const TIMETABLE_ENABLED = false

/** Student daily checklist + Pomodoro widgets. */
export const CHECKLIST_ENABLED = false

/**
 * Monitoring station: Discord voice tracking, face monitor and the
 * DeepFace analyze endpoint. Basic in-exam anti-cheat stays enabled.
 */
export const MONITORING_ENABLED = false

/** UI routes that belong to the paused online-course product. */
export const ONLINE_STUDY_ROUTE_PREFIXES = [
  "/online-student",
  "/teacher/online-study",
  "/teacher/study",
  "/resources",
  "/pricing",
  "/payment",
  "/landing",
  "/marketing/reels",
  "/live",
  "/settings/discord",
  "/student/co-study",
] as const

/** APIs that expose online-course content, access or checkout operations. */
export const ONLINE_STUDY_API_PREFIXES = [
  "/api/online-study",
  "/api/study",
  "/api/study-sessions",
  "/api/subscriptions",
  "/api/payments",
  "/api/spaced-repetition",
  "/api/discord",
] as const

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isOnlineStudyRoute(pathname: string): boolean {
  return ONLINE_STUDY_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

export function isOnlineStudyApiRoute(pathname: string): boolean {
  return ONLINE_STUDY_API_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

/** Routes hidden / redirected while gamification is locked */
export const GAMIFICATION_ROUTE_PREFIXES = [
  "/student/achievements",
  "/student/rewards",
] as const

/** APIs that belong exclusively to the locked gamification product. */
export const GAMIFICATION_API_PREFIXES = [
  "/api/achievements",
  "/api/challenges",
  "/api/daily-checkin",
  "/api/discord/daily-checkin",
  "/api/rewards",
  "/api/titles",
] as const

export function isGamificationRoute(pathname: string): boolean {
  return GAMIFICATION_ROUTE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function isGamificationApiRoute(pathname: string): boolean {
  return GAMIFICATION_API_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

export function isRegistrationOpen(): boolean {
  return REGISTRATION_ENABLED
}

/** Routes hidden / redirected while the arena is locked */
export const ARENA_ROUTE_PREFIXES = [
  "/arena",
  "/teacher/arena",
] as const

export function isArenaRoute(pathname: string): boolean {
  return ARENA_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

/** Routes hidden / redirected while timetables are locked */
export const TIMETABLE_ROUTE_PREFIXES = [
  "/student/timetable",
  "/teacher/timetable",
] as const

export function isTimetableRoute(pathname: string): boolean {
  return TIMETABLE_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

/** Routes hidden / redirected while the checklist is locked */
export const CHECKLIST_ROUTE_PREFIXES = [
  "/student/checklist",
] as const

export function isChecklistRoute(pathname: string): boolean {
  return CHECKLIST_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

/** UI routes for the monitoring station (Discord voice / face monitor). */
export const MONITORING_ROUTE_PREFIXES = [
  "/teacher/monitor",
] as const

/** APIs that serve the monitoring station. */
export const MONITORING_API_PREFIXES = [
  "/api/monitor",
] as const

export function isMonitoringRoute(pathname: string): boolean {
  return MONITORING_ROUTE_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}

export function isMonitoringApiRoute(pathname: string): boolean {
  return MONITORING_API_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix)
  )
}
