"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

interface QuestionStats {
    questionNumber: number
    correctRate: number
    mostCommonWrong: string | null
    totalAttempts: number
}

interface QuestionAnalysisTableProps {
    data: QuestionStats[]
}

function getDifficultyLabel(rate: number): { label: string; color: string } {
    if (rate >= 80) return { label: "Dễ", color: "text-green-500" }
    if (rate >= 60) return { label: "TB", color: "text-yellow-500" }
    if (rate >= 40) return { label: "Khó", color: "text-orange-500" }
    return { label: "Rất khó", color: "text-red-500" }
}

function getRateIcon(rate: number) {
    if (rate >= 70) return <ArrowUp className="w-4 h-4 text-green-500" />
    if (rate >= 40) return <Minus className="w-4 h-4 text-yellow-500" />
    return <ArrowDown className="w-4 h-4 text-red-500" />
}

export function QuestionAnalysisTable({ data }: QuestionAnalysisTableProps) {
    const sortedData = [...data].sort((a, b) => a.correctRate - b.correctRate)

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Phân tích câu hỏi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr className="text-left text-sm">
                                <th className="px-4 py-3 font-medium">Câu</th>
                                <th className="px-4 py-3 font-medium">Tỷ lệ đúng</th>
                                <th className="px-4 py-3 font-medium">Độ khó</th>
                                <th className="px-4 py-3 font-medium">Sai nhiều nhất</th>
                                <th className="px-4 py-3 font-medium text-right">Lượt làm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedData.map((question) => {
                                const difficulty = getDifficultyLabel(question.correctRate)
                                return (
                                    <tr key={question.questionNumber} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            Câu {question.questionNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {getRateIcon(question.correctRate)}
                                                <span className="font-medium">{question.correctRate.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-medium ${difficulty.color}`}>
                                                {difficulty.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {question.mostCommonWrong ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 font-medium">
                                                    {question.mostCommonWrong}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">
                                            {question.totalAttempts}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}

// Helper function to analyze questions from submissions
export function analyzeQuestions(
    submissions: Array<{ student_answers: string[] }>,
    correctAnswers: string[]
): QuestionStats[] {
    const stats: QuestionStats[] = correctAnswers.map((_, index) => ({
        questionNumber: index + 1,
        correctRate: 0,
        mostCommonWrong: null,
        totalAttempts: 0,
    }))

    const wrongAnswerCounts: Map<string, number>[] = correctAnswers.map(() => new Map())

    submissions.forEach((submission) => {
        submission.student_answers.forEach((answer, index) => {
            if (index >= correctAnswers.length) return

            stats[index].totalAttempts++

            if (answer === correctAnswers[index]) {
                stats[index].correctRate++
            } else if (answer) {
                const count = wrongAnswerCounts[index].get(answer) || 0
                wrongAnswerCounts[index].set(answer, count + 1)
            }
        })
    })

    // Calculate percentages and find most common wrong answers
    stats.forEach((stat, index) => {
        if (stat.totalAttempts > 0) {
            stat.correctRate = (stat.correctRate / stat.totalAttempts) * 100
        }

        let maxCount = 0
        wrongAnswerCounts[index].forEach((count, answer) => {
            if (count > maxCount) {
                maxCount = count
                stat.mostCommonWrong = answer
            }
        })
    })

    return stats
}
