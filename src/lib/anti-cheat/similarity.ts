/**
 * Collusion detection — pure functions, fully server-side.
 *
 * Signal model: two submissions are suspicious when they share the SAME
 * WRONG answers on multiple questions. Identical correct answers are weak
 * evidence (good students converge); identical mistakes are not coincidence.
 *
 * The system ONLY FLAGS pairs — judgment stays with the teacher, who knows
 * each student's actual ability.
 */

export interface SimilaritySubmission {
    id: string
    student_id: string
    student_name: string | null
    score: number
    submitted_at: string
    /** MC answers keyed by question number: "A" | "B" | null... */
    answers: Record<number, string | null>
}

export interface CorrectKey {
    /** question number -> correct letter */
    [question: number]: string
}

export interface FlaggedPair {
    a: Pick<SimilaritySubmission, "id" | "student_id" | "student_name" | "score">
    b: Pick<SimilaritySubmission, "id" | "student_id" | "student_name" | "score">
    /** Question numbers where BOTH chose the SAME wrong answer */
    shared_wrong_questions: number[]
    /** Questions where both gave the exact same answer (right or wrong) */
    identical_answers: number
    /** Questions where both attempted (non-null) */
    overlap: number
    /** identical_answers / overlap, % rounded */
    similarity_percent: number
    /** |submittedAt(A) - submittedAt(B)| in seconds */
    time_delta_seconds: number
}

export interface CollusionConfig {
    /** Min shared-wrong count to raise a flag (default 3). */
    minSharedWrong?: number
    /** Min answered-overlap before a pair is even considered (default 5). */
    minOverlap?: number
    /** Identical-answer % threshold used WITH minIdenticalPercentForHighOverlap. */
    highSimilarityPercent?: number
    /** Overlap required for the high-similarity rule (default 10). */
    minOverlapForHighSimilarity?: number
    /** Max flagged pairs returned, sorted by severity (default 50). */
    maxPairs?: number
}

const DEFAULTS: Required<CollusionConfig> = {
    minSharedWrong: 3,
    minOverlap: 5,
    highSimilarityPercent: 90,
    minOverlapForHighSimilarity: 10,
    maxPairs: 50,
}

/** Count of shared-wrong + identical stats for one ordered pair. */
export function analyzePair(
    a: SimilaritySubmission,
    b: SimilaritySubmission,
    key: CorrectKey
): {
    sharedWrong: number[]
    identical: number
    overlap: number
} {
    const sharedWrong: number[] = []
    let identical = 0
    let overlap = 0

    // Iterate the smaller answer set
    const [small, large] = Object.keys(a.answers).length <= Object.keys(b.answers).length
        ? [a.answers, b.answers]
        : [b.answers, a.answers]

    for (const qRaw of Object.keys(small)) {
        const q = Number(qRaw)
        const ansA = a.answers[q]
        const ansB = b.answers[q]
        if (ansA == null || ansB == null) continue
        overlap++
        if (ansA === ansB) {
            identical++
            const correct = key[q]
            if (correct != null && ansA !== correct) {
                sharedWrong.push(q)
            }
        }
    }

    return { sharedWrong, identical, overlap }
}

/**
 * Detect all suspicious pairs within one exam. Deterministic, sorted by
 * severity: most shared-wrong first, then highest similarity.
 */
export function detectCollusion(
    submissions: SimilaritySubmission[],
    key: CorrectKey,
    config: CollusionConfig = {}
): FlaggedPair[] {
    const cfg = { ...DEFAULTS, ...config }
    const flagged: FlaggedPair[] = []

    for (let i = 0; i < submissions.length; i++) {
        for (let j = i + 1; j < submissions.length; j++) {
            const a = submissions[i]
            const b = submissions[j]

            const { sharedWrong, identical, overlap } = analyzePair(a, b, key)
            if (overlap < cfg.minOverlap) continue

            const similarityPercent = Math.round((identical / overlap) * 100)
            const highSimilarity =
                similarityPercent >= cfg.highSimilarityPercent &&
                overlap >= cfg.minOverlapForHighSimilarity

            if (sharedWrong.length < cfg.minSharedWrong && !highSimilarity) continue

            const timeDeltaSeconds = Math.abs(
                (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()) / 1000
            )

            flagged.push({
                a: { id: a.id, student_id: a.student_id, student_name: a.student_name, score: a.score },
                b: { id: b.id, student_id: b.student_id, student_name: b.student_name, score: b.score },
                shared_wrong_questions: [...sharedWrong].sort((x, y) => x - y),
                identical_answers: identical,
                overlap,
                similarity_percent: similarityPercent,
                time_delta_seconds: Math.round(timeDeltaSeconds),
            })
        }
    }

    flagged.sort((p, q) =>
        q.shared_wrong_questions.length - p.shared_wrong_questions.length ||
        q.similarity_percent - p.similarity_percent
    )

    return flagged.slice(0, cfg.maxPairs)
}
