import { describe, it, expect } from "vitest"
import { analyzePair, detectCollusion, type SimilaritySubmission } from "../similarity"

// Key: 5 questions; correct = A B C D A
const KEY = { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }

function sub(
    id: string,
    studentId: string,
    answers: Record<number, string | null>,
    submittedAt = "2026-01-01T08:00:00Z",
    score = 5,
    name?: string
): SimilaritySubmission {
    return { id, student_id: studentId, student_name: name ?? null, score, submitted_at: submittedAt, answers }
}

describe("analyzePair", () => {
    it("counts shared WRONG answers only when both match each other but not the key", () => {
        const a = sub("s1", "u1", { 1: "B", 2: "X", 3: "C", 4: "A", 5: "A" } as never)
        // note: values are letters; use realistic letters below
        const aReal = sub("s1", "u1", { 1: "B", 2: "D", 3: "C", 4: "A", 5: "A" })
        const bReal = sub("s2", "u2", { 1: "B", 2: "D", 3: "C", 4: "A", 5: "B" })
        const r = analyzePair(aReal, bReal, KEY)
        // q1: B==B wrong-shared ✓ ; q2: D==D wrong-shared ✓ ; q3: C==C correct identical
        // q4: A==A wrong-shared ✓ ; q5: A vs B differ
        expect(r.sharedWrong.sort()).toEqual([1, 2, 4])
        expect(r.identical).toBe(4)
        expect(r.overlap).toBe(5)
    })

    it("identical CORRECT answers do not count as shared-wrong", () => {
        const good1 = sub("s1", "u1", { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }, undefined, 10)
        const good2 = sub("s2", "u2", { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }, undefined, 10)
        const r = analyzePair(good1, good2, KEY)
        expect(r.sharedWrong).toHaveLength(0)
        expect(r.identical).toBe(5)
    })

    it("skips null answers in overlap", () => {
        const a = sub("s1", "u1", { 1: "A", 2: null, 3: "C" })
        const b = sub("s2", "u2", { 1: "A", 2: "B", 3: "C" })
        const r = analyzePair(a, b, KEY)
        expect(r.overlap).toBe(2) // q2 excluded (null)
    })
})

describe("detectCollusion", () => {
    it("flags pairs with >= 3 shared wrong answers", () => {
        const cheater1 = sub("s1", "u1", { 1: "B", 2: "E", 3: "F", 4: "G", 5: "H" }, "2026-01-01T08:00:00Z")
        const cheater2 = sub("s2", "u2", { 1: "B", 2: "E", 3: "F", 4: "G", 5: "H" }, "2026-01-01T08:02:00Z")
        const innocent = sub("s3", "u3", { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }, "2026-01-01T08:01:00Z")

        const flagged = detectCollusion([cheater1, cheater2, innocent], KEY)
        expect(flagged).toHaveLength(1)
        expect(flagged[0].a.student_id).toBe("u1")
        expect(flagged[0].b.student_id).toBe("u2")
        expect(flagged[0].shared_wrong_questions.length).toBeGreaterThanOrEqual(3)
        expect(flagged[0].time_delta_seconds).toBe(120)
    })

    it("does NOT flag strong independent students with identical perfect papers", () => {
        const top1 = sub("s1", "u1", { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }, undefined, 10)
        const top2 = sub("s2", "u2", { 1: "A", 2: "B", 3: "C", 4: "D", 5: "A" }, undefined, 10)
        expect(detectCollusion([top1, top2], KEY)).toHaveLength(0)
    })

    it("ignores pairs whose overlap is below the minimum", () => {
        const sparse1 = sub("s1", "u1", { 1: "B" })
        const sparse2 = sub("s2", "u2", { 1: "B" })
        expect(detectCollusion([sparse1, sparse2], KEY)).toHaveLength(0)
    })

    it("sorts most-severe pairs first and respects maxPairs", () => {
        const base = { 1: "B", 2: "E", 3: "F", 4: "G", 5: "H" }
        const origin = sub("s0", "u0", base)
        const copy1 = sub("s1", "u1", { ...base, 5: "A" }) // 4 shared wrong
        const copy2 = sub("s2", "u2", { ...base, 4: "A", 5: "A" }) // 3 shared wrong
        const flagged = detectCollusion([origin, copy1, copy2], KEY, { maxPairs: 1 })
        expect(flagged).toHaveLength(1)
        expect(flagged[0].b.student_id).toBe("u1") // severity first
    })
})
