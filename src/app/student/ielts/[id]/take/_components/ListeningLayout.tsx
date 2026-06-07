"use client"

import React, { useState } from 'react'
import { Headphones, ClipboardList } from 'lucide-react'
import { IeltsTest, IeltsSection } from '@/types'
import { AudioPlayer } from './AudioPlayer'
import { QuestionRenderer } from './QuestionRenderer'

interface ListeningLayoutProps {
  test: IeltsTest
  sections: IeltsSection[]
  answers: Record<string, string>
  onAnswerChange: (questionId: string, value: string) => void
}

export function ListeningLayout({
  test,
  sections,
  answers,
  onAnswerChange
}: ListeningLayoutProps) {
  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const activeSection = sections[activeSectionIdx] || sections[0]

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chưa có tệp âm thanh nghe nào được cấu hình cho bài test này.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Trình phát Audio của Section đang hoạt động */}
      {activeSection.audio_url ? (
        <AudioPlayer 
          url={activeSection.audio_url} 
          source={activeSection.audio_source as any || 'external'} 
        />
      ) : (
        <div className="p-4 bg-red-500/5 border border-red-500/10 text-red-400 text-xs rounded-xl font-medium">
          Phần nghe này chưa được tải tệp âm thanh lên. Vui lòng liên hệ giáo viên để bổ sung.
        </div>
      )}

      {/* 2. Chọn Section (Section 1 đến 4) */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))]/25 pb-3">
        {sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setActiveSectionIdx(idx)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeSectionIdx === idx
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/35 shadow-md'
                : 'bg-[hsl(var(--muted))]/20 border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/35'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {/* 3. Render danh sách câu hỏi của section đang chọn */}
      <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))]/20 pb-3">
          <ClipboardList className="h-4.5 w-4.5 text-violet-400" />
          <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">
            Bảng câu trả lời cho {activeSection.title}
          </h3>
        </div>

        {(!activeSection.questions || activeSection.questions.length === 0) ? (
          <p className="text-xs text-muted-foreground italic text-center py-12">
            Không tìm thấy câu hỏi cho phần thi nghe này.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-12 divide-y md:divide-y-0 divide-[hsl(var(--border))]/10 md:[&>div]:border-b md:[&>div]:border-[hsl(var(--border))]/10 md:[&>div]:pb-6">
            {activeSection.questions.map((q) => (
              <div key={q.id} className="pt-4 md:pt-0">
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
  )
}
