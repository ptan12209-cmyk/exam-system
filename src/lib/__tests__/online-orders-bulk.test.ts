import { describe, it, expect } from "vitest"

/**
 * Unit helpers for bulk order id parsing (mirrors API contract).
 */
function parseOrderIds(body: { orderId?: unknown; orderIds?: unknown }): string[] {
  const orderIds: string[] = []
  if (Array.isArray(body.orderIds)) {
    for (const id of body.orderIds) {
      if (typeof id === "string" && id.trim()) orderIds.push(id.trim())
    }
  }
  if (typeof body.orderId === "string" && body.orderId.trim()) {
    orderIds.push(body.orderId.trim())
  }
  return Array.from(new Set(orderIds))
}

describe("online orders bulk id parse", () => {
  it("accepts single orderId", () => {
    expect(parseOrderIds({ orderId: " a " })).toEqual(["a"])
  })

  it("accepts orderIds array and de-dupes with orderId", () => {
    expect(parseOrderIds({ orderIds: ["a", "b", "a"], orderId: "b" })).toEqual([
      "a",
      "b",
    ])
  })

  it("ignores empty entries", () => {
    expect(parseOrderIds({ orderIds: ["", "  ", "x"] })).toEqual(["x"])
  })
})
