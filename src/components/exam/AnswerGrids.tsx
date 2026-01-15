"use client"

import { cn } from "@/lib/utils"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]

interface MCAnswerGridProps {
    answers: (Option | null)[]
    onAnswerChange: (index: number, value: Option) => void
    totalQuestions: number
}

export function MCAnswerGrid({ answers, onAnswerChange, totalQuestions }: MCAnswerGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-4">
            {Array.from({ length: totalQuestions }, (_, i) => (
                <div key={i} className="text-center">
                    <p className="text-xs text-slate-400 mb-2">Câu {i + 1}</p>
                    <div className="grid grid-cols-2 gap-1">
                        {OPTIONS.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => onAnswerChange(i, option)}
                                className={cn(
                                    "w-full py-1.5 rounded text-xs font-medium transition-colors",
                                    answers[i] === option
                                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

// True/False answer type
interface TFAnswer {
    question: number
    a: boolean
    b: boolean
    c: boolean
    d: boolean
}

interface TFAnswerGridProps {
    answers: TFAnswer[]
    onAnswerChange: (questionIndex: number, subQuestion: 'a' | 'b' | 'c' | 'd', value: boolean) => void
    startQuestion: number
    count: number
}

export function TFAnswerGrid({ answers, onAnswerChange, startQuestion, count }: TFAnswerGridProps) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }, (_, i) => {
                const qNum = startQuestion + i
                const answer = answers.find(a => a.question === qNum) || {
                    question: qNum, a: false, b: false, c: false, d: false
                }
                return (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                        <span className="text-sm font-medium text-slate-300 w-16">Câu {qNum}</span>
                        <div className="flex gap-2">
                            {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                <div key={sub} className="flex flex-col items-center gap-1">
                                    <span className="text-xs text-slate-500">{sub})</span>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onAnswerChange(i, sub, true)}
                                            className={cn(
                                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                                answer[sub]
                                                    ? "bg-green-600 text-white"
                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                            )}
                                        >
                                            Đ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAnswerChange(i, sub, false)}
                                            className={cn(
                                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                                !answer[sub]
                                                    ? "bg-red-600 text-white"
                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                            )}
                                        >
                                            S
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// Short Answer type
interface SAAnswer {
    question: number
    answer: number | string
}

interface SAAnswerGridProps {
    answers: SAAnswer[]
    onAnswerChange: (questionIndex: number, value: string) => void
    startQuestion: number
    count: number
}

export function SAAnswerGrid({ answers, onAnswerChange, startQuestion, count }: SAAnswerGridProps) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }, (_, i) => {
                const qNum = startQuestion + i
                const answer = answers.find(a => a.question === qNum)
                return (
                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                        <span className="text-sm font-medium text-slate-300 w-16">Câu {qNum}</span>
                        <input
                            type="text"
                            value={answer?.answer?.toString() || ""}
                            onChange={(e) => onAnswerChange(i, e.target.value)}
                            placeholder="Nhập đáp án (số)"
                            className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )
            })}
        </div>
    )
}
