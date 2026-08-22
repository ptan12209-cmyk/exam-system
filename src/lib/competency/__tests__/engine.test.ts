import { describe, it, expect } from "vitest"
import { computeCompetency, type AttemptInput } from "../engine"

function attempt(
    subject: string,
    score: number,
    day: number,
    extra: Partial<AttemptInput> = {}
): AttemptInput {
    return {
        exam_id: `e-${subject}-${day}`,
        subject,
        score,
        submitted_at: `2026-01-${String(day).padStart(2, "0")}T08:00:00Z`,
        ...extra,
    }
}

describe("computeCompetency", () => {
    it("computes totals and improving trend", () => {
        const r = computeCompetency([
            attempt("toan", 4, 1),
            attempt("toan", 5, 8),
            attempt("toan", 7, 15),
            attempt("toan", 8, 22),
        ])
        expect(r.totals.attempts).toBe(4)
        expect(r.totals.average).toBe(6)
        expect(r.totals.best).toBe(8)
        expect(r.trend.direction).toBe("improving") // (7+8)/2 - (4+5)/2 = +3
        expect(r.trend.delta).toBe(3)
        expect(r.consistency).toBe("medium") // std ≈ 1.58
    })

    it("marks declining trend", () => {
        const r = computeCompetency([
            attempt("ly", 9, 1),
            attempt("ly", 8, 8),
            attempt("ly", 5, 15),
            attempt("ly", 4, 22),
        ])
        expect(r.trend.direction).toBe("declining")
        expect(r.notes.some((n) => n.includes("giảm"))).toBe(true)
    })

    it("classifies subject mastery: strong / weak / insufficient", () => {
        const r = computeCompetency([
            attempt("toan", 8, 1), attempt("toan", 7, 8), attempt("toan", 8, 15), // strong
            attempt("hoa", 3, 1), attempt("hoa", 4, 8),                          // weak
            attempt("anh", 6, 1),                                                // insufficient
        ])
        const bySub = Object.fromEntries(r.bySubject.map((s) => [s.subject, s.mastery]))
        expect(bySub["toan"]).toBe("strong")
        expect(bySub["hoa"]).toBe("weak")
        expect(bySub["anh"]).toBe("insufficient")
        expect(r.strengths).toContain("toan")
        expect(r.weaknesses).toContain("hoa")
    })

    it("aggregates per-skill-type accuracy", () => {
        const r = computeCompetency([
            attempt("toan", 6, 1, { mc_correct: 6, mc_total: 10, tf_correct: 2, tf_total: 4 }),
            attempt("toan", 8, 8, { mc_correct: 8, mc_total: 10, tf_correct: 1, tf_total: 4 }),
        ])
        expect(r.bySkillType.mc).toEqual({ correct: 14, total: 20, percent: 70 })
        expect(r.bySkillType.tf.percent).toBe(38) // 3/8
        expect(r.bySkillType.sa.percent).toBe(0) // no data
    })

    it("handles empty input safely", () => {
        const r = computeCompetency([])
        expect(r.totals.attempts).toBe(0)
        expect(r.trend.direction).toBe("insufficient")
        expect(r.notes.some((n) => n.includes("cần thêm dữ liệu"))).toBe(true)
    })
})
