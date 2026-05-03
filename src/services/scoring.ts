/**
 * Scoring Service
 * Centralized logic for calculating exam scores
 */

export type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
export type SAStudentAnswer = { question: number; answer: string }
export type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
export type SAAnswer = { question: number; answer: number | string }
export type MCAnswer = { question: number; answer: string }

export interface ScoringResult {
    score: number
    totalCorrect: number
    totalQuestions: number
    details: {
        mc: { correct: number; total: number }
        tf: { correct: number; total: number }
        sa: { correct: number; total: number }
    }
}

export function calculateScore(
    mc_answers: (string | null)[],
    tf_student_answers: TFStudentAnswer[],
    sa_student_answers: SAStudentAnswer[],
    exam: {
        mc_answers?: MCAnswer[]
        correct_answers?: string[]
        tf_answers?: TFAnswer[]
        sa_answers?: SAAnswer[]
    }
): ScoringResult {
    // 1. MC Score
    let mcCorrect = 0
    const mcTotal = exam.mc_answers?.length || exam.correct_answers?.length || 0

    if (mc_answers && Array.isArray(mc_answers)) {
        mc_answers.forEach((answer, i) => {
            if (exam.mc_answers && exam.mc_answers[i]) {
                if (answer === exam.mc_answers[i].answer) mcCorrect++
            } else if (exam.correct_answers && answer === exam.correct_answers[i]) {
                mcCorrect++
            }
        })
    }

    // 2. TF Score
    let tfCorrect = 0
    const tfTotal = exam.tf_answers?.length || 0

    if (exam.tf_answers && tf_student_answers && Array.isArray(tf_student_answers)) {
        tf_student_answers.forEach(studentTf => {
            const correctTf = exam.tf_answers?.find((t) => t.question === studentTf.question)
            if (correctTf) {
                let subCorrect = 0
                if (studentTf.a === correctTf.a) subCorrect++
                if (studentTf.b === correctTf.b) subCorrect++
                if (studentTf.c === correctTf.c) subCorrect++
                if (studentTf.d === correctTf.d) subCorrect++
                tfCorrect += subCorrect / 4
            }
        })
    }

    // 3. SA Score
    let saCorrect = 0
    const saTotal = exam.sa_answers?.length || 0

    if (exam.sa_answers && sa_student_answers && Array.isArray(sa_student_answers)) {
        sa_student_answers.forEach(studentSa => {
            const correctSa = exam.sa_answers?.find((s) => s.question === studentSa.question)
            if (correctSa) {
                const correctVal = parseFloat(correctSa.answer.toString().replace(',', '.'))
                const studentVal = parseFloat(studentSa.answer.replace(',', '.'))

                // 5% tolerance for numerical answers
                const tolerance = Math.abs(correctVal) * 0.05
                if (!isNaN(studentVal) && Math.abs(correctVal - studentVal) <= tolerance) {
                    saCorrect++
                }
            }
        })
    }

    const totalQuestions = mcTotal + tfTotal + saTotal
    const totalCorrect = mcCorrect + tfCorrect + saCorrect
    const score = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 10 : 0

    return {
        score: Math.round(score * 100) / 100,
        totalCorrect,
        totalQuestions,
        details: {
            mc: { correct: mcCorrect, total: mcTotal },
            tf: { correct: tfCorrect, total: tfTotal },
            sa: { correct: saCorrect, total: saTotal }
        }
    }
}
