/**
 * Dịch vụ tính điểm — Logic tập trung để tính điểm bài thi.
 */

import type { TFStudentAnswer, SAStudentAnswer, MCAnswer, TFAnswer, SAAnswer, ScoringResult } from '@/types/exam'

export type { ScoringResult, TFStudentAnswer, SAStudentAnswer }

/**
 * Tính điểm cho bài thi dựa trên câu trả lời của học sinh.
 * Xử lý ba loại câu hỏi: trắc nghiệm (MC), đúng/sai (TF), và trả lời ngắn (SA).
 * Điểm được chuẩn hóa về thang 10.
 *
 * @param mc_answers - Mảng câu trả lời trắc nghiệm của học sinh (mỗi phần tử là đáp án hoặc null).
 * @param tf_student_answers - Mảng câu trả lời đúng/sai của học sinh.
 * @param sa_student_answers - Mảng câu trả lời ngắn của học sinh.
 * @param exam - Đối tượng bài thi chứa đáp án đúng (mc_answers, tf_answers, sa_answers).
 * @returns Đối tượng ScoringResult gồm score, totalCorrect, totalQuestions, và chi tiết từng phần.
 */
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
                
                let tfPoints = 0
                if (subCorrect === 1) tfPoints = 0.1
                else if (subCorrect === 2) tfPoints = 0.25
                else if (subCorrect === 3) tfPoints = 0.5
                else if (subCorrect === 4) tfPoints = 1.0
                tfCorrect += tfPoints
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
