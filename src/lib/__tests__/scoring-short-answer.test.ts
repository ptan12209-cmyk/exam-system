import { describe, expect, it } from "vitest"
import { calculateScore } from "@/services/scoring"

describe("calculateScore short answers", () => {
  it("grades normalized text answers", () => {
    const result = calculateScore([], [], [{ question: 1, answer: "  hà nội " }], {
      sa_answers: [{ question: 1, answer: "Hà Nội" }],
    })

    expect(result.details.sa.correct).toBe(1)
    expect(result.score).toBe(10)
  })

  it("keeps numerical tolerance for short answers", () => {
    const result = calculateScore([], [], [{ question: 1, answer: "104" }], {
      sa_answers: [{ question: 1, answer: "100" }],
    })

    expect(result.details.sa.correct).toBe(1)
  })
})
