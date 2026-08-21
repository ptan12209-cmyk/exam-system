import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import * as features from "../features"

/**
 * Guards against empty / stripped features.ts blob (broke Vercel once).
 */
describe("feature flags module", () => {
  it("file on disk is non-empty", () => {
    const path = join(__dirname, "../features.ts")
    const raw = readFileSync(path, "utf8")
    expect(raw.trim().length).toBeGreaterThan(200)
    expect(raw).toMatch(/export const GAMIFICATION_ENABLED/)
    expect(raw).toMatch(/export function isRegistrationOpen/)
  })

  it("exports required flags and helpers", () => {
    expect(typeof features.GAMIFICATION_ENABLED).toBe("boolean")
    expect(typeof features.ONLINE_STUDY_ENABLED).toBe("boolean")
    expect(typeof features.REGISTRATION_ENABLED).toBe("boolean")
    expect(typeof features.SINGLE_DEVICE_ENABLED).toBe("boolean")
    expect(typeof features.BUNNY_SECURITY_CHECKLIST_ENABLED).toBe("boolean")
    expect(typeof features.ARENA_ENABLED).toBe("boolean")
    expect(typeof features.TIMETABLE_ENABLED).toBe("boolean")
    expect(typeof features.CHECKLIST_ENABLED).toBe("boolean")
    expect(typeof features.MONITORING_ENABLED).toBe("boolean")
    expect(Array.isArray(features.ONLINE_STUDY_ROUTE_PREFIXES)).toBe(true)
    expect(Array.isArray(features.ONLINE_STUDY_API_PREFIXES)).toBe(true)
    expect(typeof features.isOnlineStudyRoute).toBe("function")
    expect(typeof features.isOnlineStudyApiRoute).toBe("function")
    expect(Array.isArray(features.GAMIFICATION_ROUTE_PREFIXES)).toBe(true)
    expect(Array.isArray(features.GAMIFICATION_API_PREFIXES)).toBe(true)
    expect(typeof features.isGamificationRoute).toBe("function")
    expect(typeof features.isGamificationApiRoute).toBe("function")
    expect(typeof features.isRegistrationOpen).toBe("function")
    expect(typeof features.isArenaRoute).toBe("function")
    expect(typeof features.isTimetableRoute).toBe("function")
    expect(typeof features.isChecklistRoute).toBe("function")
    expect(typeof features.isMonitoringRoute).toBe("function")
    expect(typeof features.isMonitoringApiRoute).toBe("function")
  })

  it("keeps public registration permanently disabled", () => {
    expect(features.REGISTRATION_ENABLED).toBe(false)
    expect(features.isRegistrationOpen()).toBe(false)
  })

  it("classifies online-study UI and API paths without blocking exam routes", () => {
    expect(features.isOnlineStudyRoute("/online-student/dashboard")).toBe(true)
    expect(features.isOnlineStudyRoute("/teacher/online-study")).toBe(true)
    expect(features.isOnlineStudyRoute("/settings/discord")).toBe(true)
    expect(features.isOnlineStudyRoute("/student/exams")).toBe(false)
    expect(features.isOnlineStudyApiRoute("/api/online-study/lessons")).toBe(true)
    expect(features.isOnlineStudyApiRoute("/api/spaced-repetition/due")).toBe(true)
    expect(features.isOnlineStudyApiRoute("/api/exams/submit")).toBe(false)
    expect(features.isGamificationApiRoute("/api/achievements")).toBe(true)
    expect(features.isGamificationApiRoute("/api/exams/submit")).toBe(false)
  })

  it("classifies core-focus lock routes without blocking exam routes", () => {
    expect(features.ARENA_ENABLED).toBe(false)
    expect(features.TIMETABLE_ENABLED).toBe(false)
    expect(features.CHECKLIST_ENABLED).toBe(false)
    expect(features.MONITORING_ENABLED).toBe(false)

    expect(features.isArenaRoute("/arena")).toBe(true)
    expect(features.isArenaRoute("/teacher/arena/new")).toBe(true)
    expect(features.isArenaRoute("/student/exams")).toBe(false)

    expect(features.isTimetableRoute("/student/timetable")).toBe(true)
    expect(features.isTimetableRoute("/teacher/timetable/edit")).toBe(true)
    expect(features.isTimetableRoute("/teacher/dashboard")).toBe(false)

    expect(features.isChecklistRoute("/student/checklist")).toBe(true)
    expect(features.isChecklistRoute("/student/dashboard")).toBe(false)

    expect(features.isMonitoringRoute("/teacher/monitor")).toBe(true)
    expect(features.isMonitoringApiRoute("/api/monitor/analyze")).toBe(true)
    expect(features.isMonitoringApiRoute("/api/exams/submit")).toBe(false)
  })
})
