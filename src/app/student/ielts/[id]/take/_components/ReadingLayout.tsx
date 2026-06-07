"use client"

import React, { useState } from 'react'
import { AlignLeft, HelpCircle } from 'lucide-react'
import { IeltsTest, IeltsSection } from '@/types'
import { QuestionRenderer } from './QuestionRenderer'

interface ReadingLayoutProps {
  test: IeltsTest
  sections: IeltsSection[]
  answers: Record<string, string>
  onAnswerChange: (questionId: string, value: string) => void
}

export function ReadingLayout({
  test,
  sections,
  answers,
  onAnswerChange
}: ReadingLayoutProps) {
  const [activePassageIdx, setActivePassageIdx] = useState(0)
  const activeSection = sections[activePassageIdx] || sections[0]

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chưa có phần thi đọc nào được cấu hình cho bài test này.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Passage Tab Select */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))]/25 pb-3">
        {sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setActivePassageIdx(idx)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activePassageIdx === idx
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35 shadow-md'
                : 'bg-[hsl(var(--muted))]/20 border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/35'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {/* Split-screen Layout: Passage on left, Questions on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left pane: Reading Passage */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))] h-[calc(100vh-280px)] overflow-y-auto min-h-[400px] flex-1 shadow-sm">
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground text-center mb-6 leading-tight select-none">
              {activeSection.title}
            </h2>
            
            {/* Chặn copy-paste bằng cách áp dụng user-select: none */}
            <div 
              className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground select-none pointer-events-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                msUserSelect: 'none',
                MozUserSelect: 'none'
              }}
              dangerouslySetInnerHTML={{ __html: activeSection.passage_content || '' }}
            />
          </div>
        </div>

        {/* Right pane: Question list */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-5 bg-[hsl(var(--card))] h-[calc(100vh-280px)] overflow-y-auto min-h-[400px] flex-1 space-y-6 shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-[hsl(var(--border))]/20 pb-2">
              <HelpCircle className="h-4.5 w-4.5 text-cyan-400" />
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Câu hỏi của {activeSection.title}
              </h3>
            </div>

            {(!activeSection.questions || activeSection.questions.length === 0) ? (
              <p className="text-xs text-muted-foreground italic text-center py-12">
                Không tìm thấy câu hỏi cho phần này.
              </p>
            ) : (
              <div className="space-y-6 divide-y divide-[hsl(var(--border))]/10">
                {activeSection.questions.map((q, idx) => (
                  <div key={q.id} className={idx > 0 ? 'pt-6' : ''}>
                    <QuestionRenderer
                      question={q}
                      value={answers[q.id] || ''}
                      onChange={(val) => onAnswerChange(q.id, val)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
