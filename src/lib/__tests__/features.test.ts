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
    expect(Array.isArray(features.ONLINE_STUDY_ROUTE_PREFIXES)).toBe(true)
    expect(Array.isArray(features.ONLINE_STUDY_API_PREFIXES)).toBe(true)
    expect(typeof features.isOnlineStudyRoute).toBe("function")
    expect(typeof features.isOnlineStudyApiRoute).toBe("function")
    expect(Array.isArray(features.GAMIFICATION_ROUTE_PREFIXES)).toBe(true)
    expect(Array.isArray(features.GAMIFICATION_API_PREFIXES)).toBe(true)
    expect(typeof features.isGamificationRoute).toBe("function")
    expect(typeof features.isGamificationApiRoute).toBe("function")
    expect(typeof features.isRegistrationOpen).toBe("function")
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
})
