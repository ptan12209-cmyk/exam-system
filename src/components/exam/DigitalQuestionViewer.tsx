import React from "react"
import { Check } from "lucide-react"
import Latex from "react-latex-next"
import "katex/dist/katex.min.css"

type Option = "A" | "B" | "C" | "D"

import type { Question } from "@/types"

interface DigitalQuestionViewerProps {
    questions: Question[]
    mcAnswers: (Option | null)[]
    tfAnswers: { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }[]
    saAnswers: { question: number; answer: string }[]
    onMcSelect: (questionIndex: number, option: Option) => void
    onTfSelect: (tfIndex: number, opt: 'a' | 'b' | 'c' | 'd', val: boolean) => void
    onSaChange: (saIndex: number, val: string) => void
}

export function DigitalQuestionViewer({
    questions, mcAnswers, tfAnswers, saAnswers,
    onMcSelect, onTfSelect, onSaChange
}: DigitalQuestionViewerProps) {

    let mcCounter = 0
    let tfCounter = 0
    let saCounter = 0

    return (
        <div className="space-y-8 p-6 max-w-4xl mx-auto">
            {questions.map((q, idx) => {
                const globalIndex = idx + 1

                if (q.question_type === 'mc') {
                    const currentMcIdx = mcCounter++
                    const selected = mcAnswers[currentMcIdx]
                    
                    return (
                        <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl p-6 border shadow-sm" id={`question-${globalIndex}`}>
                            <div className="flex gap-4">
                                <div className="shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                                        {globalIndex}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="text-base font-medium whitespace-pre-wrap"><Latex>{q.content || ""}</Latex></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        {q.options && q.options.map((opt, i) => {
                                            const letter = ["A", "B", "C", "D"][i] as Option
                                            const isSelected = selected === letter
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => onMcSelect(currentMcIdx, letter)}
                                                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition-colors ${
                                                        isSelected 
                                                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/20' 
                                                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                    <span className={`font-bold ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>
                                                        {letter}.
                                                    </span>
                                                    <span className="flex-1 overflow-x-auto"><Latex>{opt}</Latex></span>
                                                    {isSelected && <Check className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                if (q.question_type === 'tf') {
                    const currentTfIdx = tfCounter++
                    const currentAnswer = tfAnswers[currentTfIdx]
                    
                    return (
                        <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl p-6 border shadow-sm" id={`question-${globalIndex}`}>
                            <div className="flex gap-4">
                                <div className="shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                                        {globalIndex}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="text-base font-medium whitespace-pre-wrap"><Latex>{q.content || ""}</Latex></div>
                                    <div className="space-y-2 mt-4 border rounded-lg overflow-hidden">
                                        {(['a','b','c','d'] as const).map((k) => (
                                            <div key={k} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-b last:border-0 bg-slate-50 dark:bg-slate-800/50 gap-3">
                                                <div className="font-medium flex items-center gap-2">
                                                    <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-1 rounded font-bold uppercase text-slate-600 dark:text-slate-300">Ý {k}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => onTfSelect(currentTfIdx, k, true)}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentAnswer?.[k] === true ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 border hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                                    >
                                                        Đúng
                                                    </button>
                                                    <button 
                                                        onClick={() => onTfSelect(currentTfIdx, k, false)}
                                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${currentAnswer?.[k] === false ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-700 border hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                                    >
                                                        Sai
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                if (q.question_type === 'sa') {
                    const currentSaIdx = saCounter++
                    const currentAnswer = saAnswers[currentSaIdx]?.answer || ""
                    
                    return (
                        <div key={q.id} className="bg-white dark:bg-slate-900 rounded-xl p-6 border shadow-sm" id={`question-${globalIndex}`}>
                            <div className="flex gap-4">
                                <div className="shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                                        {globalIndex}
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="text-base font-medium whitespace-pre-wrap"><Latex>{q.content || ""}</Latex></div>
                                    <div className="mt-4">
                                        <input 
                                            type="text"
                                            value={currentAnswer}
                                            onChange={(e) => onSaChange(currentSaIdx, e.target.value)}
                                            placeholder="Nhập đáp án của bạn..."
                                            className="w-full sm:max-w-md px-4 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                return null
            })}
        </div>
    )
}
