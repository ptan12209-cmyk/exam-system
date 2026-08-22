/**
 * Competency engine — aggregates multiple exam attempts into a mastery
 * profile. Pure functions only; no I/O. The teacher (not the algorithm)
 * makes final judgments about students.
 */

export interface AttemptInput {
    exam_id: string
    subject: string
    score: number // 0–10
    submitted_at: string
    mc_correct?: number | null
    mc_total?: number | null
    tf_correct?: number | null
    tf_total?: number | null
    sa_correct?: number | null
    sa_total?: number | null
}

export type MasteryLevel = "strong" | "moderate" | "weak"
export type TrendDirection = "improving" | "declining" | "stable" | "insufficient"

export interface SubjectMastery {
    subject: string
    attempts: number
    average: number
    best: number
    latest: number
    /** latest vs previous average of this subject */
    delta: number
    mastery: MasteryLevel | "insufficient"
}

export interface SkillTypeStat {
    correct: number
    total: number
    percent: number
}

export interface CompetencyResult {
    totals: {
        attempts: number
        average: number
        best: number
        firstAttemptAt: string | null
        lastAttemptAt: string | null
    }
    trend: { direction: TrendDirection; delta: number }
    /** Score volatility across attempts */
    consistency: "high" | "medium" | "low" | "unknown"
    bySubject: SubjectMastery[]
    bySkillType: { mc: SkillTypeStat; tf: SkillTypeStat; sa: SkillTypeStat }
    strengths: string[]
    weaknesses: string[]
    notes: string[]
}

function round1(n: number): number {
    return Math.round(n * 10) / 10
}

function mean(nums: number[]): number {
    if (nums.length === 0) return 0
    return nums.reduce((s, n) => s + n, 0) / nums.length
}

function skillStat(correct: number | null | undefined, total: number | null | undefined): SkillTypeStat {
    const c = Number(correct ?? 0)
    const t = Number(total ?? 0)
    return { correct: c, total: t, percent: t > 0 ? Math.round((c / t) * 100) : 0 }
}

/** Aggregate all attempts into a competency profile. */
export function computeCompetency(input: AttemptInput[]): CompetencyResult {
    const attempts = [...input].sort(
        (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    )

    const scores = attempts.map((a) => a.score)
    const attemptsCount = attempts.length

    const totals = {
        attempts: attemptsCount,
        average: attemptsCount ? round1(mean(scores)) : 0,
        best: attemptsCount ? Math.max(...scores) : 0,
        firstAttemptAt: attempts[0]?.submitted_at ?? null,
        lastAttemptAt: attempts[attemptsCount - 1]?.submitted_at ?? null,
    }

    // --- Overall trend: compare second half vs first half ---
    let direction: TrendDirection = "insufficient"
    let delta = 0
    if (attemptsCount >= 3) {
        const half = Math.floor(attemptsCount / 2)
        const prior = mean(scores.slice(0, half))
        const recent = mean(scores.slice(half))
        delta = round1(recent - prior)
        direction = delta >= 0.5 ? "improving" : delta <= -0.5 ? "declining" : "stable"
    }

    // --- Consistency (std-dev bands) ---
    let consistency: CompetencyResult["consistency"] = "unknown"
    if (attemptsCount >= 3) {
        const variance = mean(scores.map((s) => (s - totals.average) ** 2))
        const std = Math.sqrt(variance)
        consistency = std <= 1 ? "high" : std <= 2.5 ? "medium" : "low"
    }

    // --- Per-subject mastery ---
    const bySubjectMap = new Map<string, number[]>()
    for (const a of attempts) {
        const subj = a.subject || "other"
        if (!bySubjectMap.has(subj)) bySubjectMap.set(subj, [])
        bySubjectMap.get(subj)!.push(a.score)
    }

    const strengths: string[] = []
    const weaknesses: string[] = []
    const bySubject: SubjectMastery[] = []

    for (const [subject, subscores] of bySubjectMap) {
        const avg = round1(mean(subscores))
        const latestScore = subscores[subscores.length - 1]
        const priorHalf = subscores.slice(0, Math.max(1, subscores.length - 1))
        const subjDelta = round1(latestScore - mean(priorHalf))

        let mastery: SubjectMastery["mastery"]
        if (subscores.length < 2) mastery = "insufficient"
        else if (subscores.length >= 3 && avg >= 6.5) mastery = "strong"
        else if (avg < 5) mastery = "weak"
        else mastery = "moderate"

        if (mastery === "strong") strengths.push(subject)
        if (mastery === "weak") weaknesses.push(subject)

        bySubject.push({
            subject,
            attempts: subscores.length,
            average: avg,
            best: Math.max(...subscores),
            latest: latestScore,
            delta: subjDelta,
            mastery,
        })
    }
    bySubject.sort((x, y) => y.average - x.average)

    // --- Per-skill-type accuracy across all attempts ---
    const sum = (get: (a: AttemptInput) => number | null | undefined) =>
        attempts.reduce((acc, a) => acc + (get(a) ?? 0), 0)

    const bySkillType = {
        mc: skillStat(sum((a) => a.mc_correct), sum((a) => a.mc_total)),
        tf: skillStat(sum((a) => a.tf_correct), sum((a) => a.tf_total)),
        sa: skillStat(sum((a) => a.sa_correct), sum((a) => a.sa_total)),
    }

    // --- Human-readable notes ---
    const notes: string[] = []
    if (attemptsCount < 3) {
        notes.push(`Chỉ có ${attemptsCount} lượt làm bài — cần thêm dữ liệu để đánh giá xu hướng.`)
    }
    if (direction === "improving") notes.push(`Điểm đang tiến bộ (+"${delta}" điểm giữa nửa đầu và nửa cuối).`.replace('+"', "+").replace('"', ""))
    if (direction === "declining") notes.push(`Điểm giảm ${Math.abs(delta)} điểm gần đây — cần quan tâm kịp thời.`)
    if (weaknesses.length) notes.push(`Môn/yếu tố yếu: ${weaknesses.join(", ")}.`)
    if (bySkillType.mc.total > 0 && bySkillType.mc.percent < 50) notes.push(`Trắc nghiệm chỉ đúng ${bySkillType.mc.percent}% — nên luyện kỹ năng đọc đề và loại trừ đáp án.`)
    if (bySkillType.tf.total > 0 && bySkillType.tf.percent < 50) notes.push(`Dạng Đúng/Sai còn yếu (${bySkillType.tf.percent}%) — thường do đọc thiếu ý nhỏ trong phát biểu.`)

    return {
        totals,
        trend: { direction, delta },
        consistency,
        bySubject,
        bySkillType,
        strengths,
        weaknesses,
        notes,
    }
}
