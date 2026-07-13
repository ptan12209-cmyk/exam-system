import { describe, it, expect } from "vitest"
import { PRICING, INTRO_SUBJECTS } from "../../data/courses-intro"

describe("courses intro pricing & catalog", () => {
  it("every plan has positive prices and discount", () => {
    for (const plan of Object.values(PRICING)) {
      expect(plan.price).toBeGreaterThan(0)
      expect(plan.originalPrice).toBeGreaterThan(plan.price)
      expect(plan.discountPercent).toBeGreaterThan(0)
      expect(plan.discountPercent).toBeLessThanOrEqual(50)
    }
  })

  it("all plans are contact-locked while marketing-only", () => {
    for (const plan of Object.values(PRICING)) {
      expect(plan.contactEnabled).toBe(false)
      expect(plan.badge).toBe("Sắp mở")
    }
  })

  it("intro subjects include DGNL tracks", () => {
    const values = INTRO_SUBJECTS.map((s) => s.value)
    expect(values).toContain("dgnl_hsa")
    expect(values).toContain("dgnl_vact")
    expect(values).toContain("dgnl_tsa")
    expect(values).toContain("dgnl_sp")
  })
})
