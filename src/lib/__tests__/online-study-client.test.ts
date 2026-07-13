import { describe, it, expect } from "vitest"
import { hasOnlineSubjectAccess } from "../online-study-client"

describe("hasOnlineSubjectAccess", () => {
  it("allows all", () => {
    expect(hasOnlineSubjectAccess(["all"], "toan")).toBe(true)
  })

  it("matches catalog key", () => {
    expect(hasOnlineSubjectAccess(["toan", "ly"], "toan")).toBe(true)
    expect(hasOnlineSubjectAccess(["toan"], "hoa")).toBe(false)
  })

  it("matches db alias of catalog key", () => {
    // unlocked stored as catalog; query catalog
    expect(hasOnlineSubjectAccess(["toan"], "toan")).toBe(true)
    // unlocked stored as db key; open with catalog
    expect(hasOnlineSubjectAccess(["math"], "toan")).toBe(true)
    // unlocked catalog; open with db key
    expect(hasOnlineSubjectAccess(["toan"], "math")).toBe(true)
  })
})
