"use client"

import React, { useState } from 'react'
import { Check, X, HelpCircle, BookOpen, AlertTriangle } from 'lucide-react'
import { IeltsTest, IeltsSection, IeltsQuestion } from '@/types'

interface ReadingResultProps {
  test: IeltsTest
  sections: IeltsSection[]
  studentAnswers: Array<{ question_id: string; answer: string }>
}

export function ReadingResult({ test, sections, studentAnswers }: ReadingResultProps) {
  const [activeTabIdx, setActiveTabIdx] = useState(0)
  const activeSection = sections[activeTabIdx] || sections[0]

  if (sections.length === 0) return null

  // Tìm câu trả lời học sinh đã nhập cho 1 question
  const getStudentAnswer = (questionId: string) => {
    const found = studentAnswers.find(sa => sa.question_id === questionId)
    return found ? found.answer.trim() : ''
  }

  // So sánh kết quả câu hỏi
  const isCorrect = (question: IeltsQuestion) => {
    const studentAns = getStudentAnswer(question.id).toLowerCase()
    const correctAns = question.correct_answer.trim().toLowerCase()
    return studentAns === correctAns
  }

  return (
    <div className="space-y-6">
      {/* Passage Selector */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))]/20 pb-3">
        {sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setActiveTabIdx(idx)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeTabIdx === idx
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35 shadow-md'
                : 'bg-[hsl(var(--muted))]/20 border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/35'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cột trái: Nội dung Passage bài đọc (Chỉ hiện cho Reading) */}
        {test.skill === 'reading' && (
          <div className="lg:col-span-6 flex flex-col">
            <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))] h-[550px] overflow-y-auto prose prose-invert select-none shadow-sm">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground text-center mb-6">{activeSection.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: activeSection.passage_content || '' }} />
            </div>
          </div>
        )}

        {/* Cột phải: Đáp án chi tiết (Cho Reading/Listening) */}
        <div className={test.skill === 'reading' ? 'lg:col-span-6 flex flex-col' : 'w-full'}>
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-5 bg-[hsl(var(--card))] h-[550px] overflow-y-auto space-y-6 shadow-sm">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-[hsl(var(--border))]/20 pb-2">
              Chi tiết câu trả lời
            </h3>

            {(!activeSection.questions || activeSection.questions.length === 0) ? (
              <p className="text-xs text-muted-foreground italic text-center py-12">Phần này không có câu hỏi.</p>
            ) : (
              <div className="space-y-6 divide-y divide-[hsl(var(--border))]/10">
                {activeSection.questions.map((q, idx) => {
                  const studentAns = getStudentAnswer(q.id)
                  const correct = isCorrect(q)

                  return (
                    <div key={q.id} className={`space-y-2 ${idx > 0 ? 'pt-6' : ''}`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
                          Câu {q.question_number}
                        </span>
                        
                        <span className={`flex items-center gap-1 font-bold ${correct ? 'text-emerald-400' : 'text-red-400'}`}>
                          {correct ? (
                            <><Check className="w-3.5 h-3.5" /> Đúng</>
                          ) : (
                            <><X className="w-3.5 h-3.5" /> Sai</>
                          )}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question_text}</p>

                      {/* Options hiển thị trắc nghiệm */}
                      {q.question_type === 'multiple_choice' && q.options && (
                        <div className="grid grid-cols-2 gap-2 pl-4 text-xs text-muted-foreground mt-1">
                          {q.options.map((opt: { key?: string; text?: string } | string, i: number) => {
                             const key = (typeof opt === 'object' && opt ? opt.key : null) || String.fromCharCode(65 + i)
                             const text = String((typeof opt === 'object' && opt ? opt.text : opt) || '')
                             const isSelect = studentAns === key
                            const isCorrectKey = q.correct_answer === key
                            return (
                              <div 
                                key={key} 
                                className={`p-2 rounded-xl border ${
                                  isCorrectKey 
                                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' 
                                    : isSelect 
                                    ? 'border-red-500/30 bg-red-500/5 text-red-400' 
                                    : 'border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 text-muted-foreground'
                                }`}
                              >
                                <span className="font-bold mr-1">{key}.</span> {text}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Kết quả text */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 pl-4 text-xs font-semibold">
                        <div className={`p-2.5 rounded-xl border flex flex-col ${correct ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'}`}>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Bạn trả lời:</span>
                          <span className="mt-0.5">{studentAns || '(Bỏ trống)'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Đáp án đúng:</span>
                          <span className="mt-0.5">{q.correct_answer}</span>
                        </div>
                      </div>

                      {/* Giải thích đáp án */}
                      {q.explanation && (
                        <div className="mt-2 pl-4 text-[11px] leading-relaxed text-muted-foreground bg-[hsl(var(--muted))]/10 p-2.5 rounded-xl border border-[hsl(var(--border))]/50">
                          <strong>Lý giải:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export function ListeningResult(props: ReadingResultProps) {
  return <ReadingResult {...props} />
}
