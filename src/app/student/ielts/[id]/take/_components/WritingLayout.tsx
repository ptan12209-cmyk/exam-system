"use client"

import React, { useState, useMemo } from 'react'
import { FileText, Sparkles, Image, CheckCircle } from 'lucide-react'
import { IeltsTest, IeltsSection } from '@/types'

interface WritingLayoutProps {
  test: IeltsTest
  sections: IeltsSection[]
  value: string
  onChange: (value: string) => void
}

export function WritingLayout({
  test,
  sections,
  value,
  onChange
}: WritingLayoutProps) {
  const [activeTaskIdx, setActiveTaskIdx] = useState(0)
  const activeSection = sections[activeTaskIdx] || sections[0]

  // Tính số từ thực tế của câu trả lời
  const wordCount = useMemo(() => {
    if (!value.trim()) return 0
    return value.trim().split(/\s+/).filter(Boolean).length
  }, [value])

  const requiredMinWords = activeSection?.min_words || (activeSection?.writing_task_type === 'task2' ? 250 : 150)
  const hasEnoughWords = wordCount >= requiredMinWords

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Chưa có đề bài Writing nào được cấu hình cho bài test này.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Task Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))]/25 pb-3">
        {sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setActiveTaskIdx(idx)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeTaskIdx === idx
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/35 shadow-md'
                : 'bg-[hsl(var(--muted))]/20 border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/35'
            }`}
          >
            {sec.title} ({sec.writing_task_type === 'task2' ? 'Task 2' : 'Task 1'})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left pane: Writing Prompt */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))] h-[calc(100vh-280px)] overflow-y-auto min-h-[400px] flex-1 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-2.5">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                Đề bài IELTS Writing
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground bg-[hsl(var(--muted))]/20 px-2 py-1 rounded-lg">
                Min: {requiredMinWords} từ
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
              {activeSection.writing_prompt}
            </p>

            {activeSection.writing_image_url && (
              <div className="border border-[hsl(var(--border))]/60 rounded-xl overflow-hidden bg-black/40 p-2.5 flex items-center justify-center">
                <img 
                  src={activeSection.writing_image_url} 
                  alt="Writing Chart" 
                  className="max-h-[260px] object-contain rounded-lg border border-[hsl(var(--border))]/25" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Text editor */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-5 bg-[hsl(var(--card))] h-[calc(100vh-280px)] overflow-y-auto min-h-[400px] flex-1 flex flex-col justify-between shadow-sm">
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Bài viết của bạn
                </span>
                
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> Chấm tự động bởi AI
                </span>
              </div>

              {/* Text Area */}
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Nhập câu trả lời bài luận của bạn tại đây (sử dụng tiếng Anh học thuật)..."
                className="w-full flex-1 min-h-[250px] rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] p-4 text-sm text-foreground focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all font-sans leading-relaxed resize-none"
              />
            </div>

            {/* Word count status & indicator */}
            <div className="pt-4 mt-4 border-t border-[hsl(var(--border))]/20 flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg ${
                  hasEnoughWords 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {wordCount} từ
                </span>
                {!hasEnoughWords && (
                  <span className="text-muted-foreground font-medium text-[11px]">
                    (Cần viết thêm ít nhất {requiredMinWords - wordCount} từ nữa)
                  </span>
                )}
                {hasEnoughWords && (
                  <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-0.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Đạt yêu cầu số từ tối thiểu
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
