import { createHash } from 'crypto'

/**
 * Generate a deterministic version hash for an exam package.
 * Used to detect when an exam has changed since it was downloaded for offline use.
 *
 * @param examData - The exam object from Supabase (must include id, title, mc_answers, tf_answers, sa_answers)
 * @returns Hex-encoded SHA-256 hash string
 */
export function generatePackageVersion(examData: Record<string, unknown>): string {
    // Hash over: id + title + total_questions + structural data of answers (not correct values)
    // This ensures version changes when questions are added/removed/reordered,
    // but NOT when unrelated metadata changes.
    const payload = JSON.stringify({
        id: examData.id,
        title: examData.title,
        total_questions: examData.total_questions,
        mc_count: Array.isArray(examData.mc_answers) ? examData.mc_answers.length : 0,
        tf_count: Array.isArray(examData.tf_answers) ? examData.tf_answers.length : 0,
        sa_count: Array.isArray(examData.sa_answers) ? examData.sa_answers.length : 0,
        // Include question numbers only (not answers) to detect reordering
        mc_questions: Array.isArray(examData.mc_answers)
            ? examData.mc_answers.map((q: { question: number }) => q.question)
            : [],
        tf_questions: Array.isArray(examData.tf_answers)
            ? examData.tf_answers.map((q: { question: number }) => q.question)
            : [],
        sa_questions: Array.isArray(examData.sa_answers)
            ? examData.sa_answers.map((q: { question: number }) => q.question)
            : [],
    })
    return createHash('sha256').update(payload).digest('hex')
}

/**
 * Compare a submitted package version against the current exam version.
 * Used to detect conflicts when syncing offline submissions.
 *
 * @param currentVersion - Version hash from the current exam (generated fresh by server)
 * @param submittedVersion - Version hash submitted by the client (from their offline package)
 * @returns true if versions match, false if there's a conflict
 */
export function validatePackageVersion(currentVersion: string, submittedVersion: string): boolean {
    if (!currentVersion || !submittedVersion) return false
    return currentVersion === submittedVersion
}
