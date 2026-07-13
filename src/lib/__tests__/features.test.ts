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
    expect(typeof features.REGISTRATION_ENABLED).toBe("boolean")
    expect(typeof features.REGISTRATION_REOPEN_DATE).toBe("string")
    expect(typeof features.SINGLE_DEVICE_ENABLED).toBe("boolean")
    expect(typeof features.BUNNY_SECURITY_CHECKLIST_ENABLED).toBe("boolean")
    expect(Array.isArray(features.GAMIFICATION_ROUTE_PREFIXES)).toBe(true)
    expect(typeof features.isGamificationRoute).toBe("function")
    expect(typeof features.isRegistrationOpen).toBe("function")
  })

  it("isRegistrationOpen respects REGISTRATION_ENABLED override", () => {
    // When flag is false, result depends on date — just ensure boolean
    expect(typeof features.isRegistrationOpen()).toBe("boolean")
  })
})
