import { describe, it, expect } from "vitest"
import {
  extractDeviceIdFromRequest,
  isStaffRole,
  isValidDeviceId,
} from "../device-binding"

describe("device-binding pure helpers", () => {
  it("validates device id shape", () => {
    expect(isValidDeviceId("a".repeat(16))).toBe(true)
    expect(isValidDeviceId("short")).toBe(false)
    expect(isValidDeviceId("")).toBe(false)
    expect(isValidDeviceId(null)).toBe(false)
  })

  it("extracts device id from header", () => {
    const id = "a".repeat(32)
    const req = new Request("https://example.com", {
      headers: { "x-device-id": id },
    })
    expect(extractDeviceIdFromRequest(req)).toBe(id)
  })

  it("extracts device id from cookie", () => {
    const id = "b".repeat(32)
    const req = new Request("https://example.com", {
      headers: { cookie: `other=1; sh_device_id=${id}; foo=bar` },
    })
    expect(extractDeviceIdFromRequest(req)).toBe(id)
  })

  it("returns null when missing", () => {
    const req = new Request("https://example.com")
    expect(extractDeviceIdFromRequest(req)).toBeNull()
  })

  it("identifies staff roles", () => {
    expect(isStaffRole("teacher")).toBe(true)
    expect(isStaffRole("admin")).toBe(true)
    expect(isStaffRole("student")).toBe(false)
    expect(isStaffRole("online_student")).toBe(false)
    expect(isStaffRole(null)).toBe(false)
  })
})
