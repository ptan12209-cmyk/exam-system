"use client"

import React, { useState } from 'react'
import { Eye, Headphones, Play, BookOpen, AlertCircle, Sparkles } from 'lucide-react'
import { IeltsTest, IeltsSection, IeltsQuestion } from '@/types'
import { QUESTION_TYPE_LABELS } from '@/lib/ielts'

interface TestPreviewProps {
  test: IeltsTest
  sections: IeltsSection[]
}

export function TestPreview({ test, sections }: TestPreviewProps) {
  const [activeTab, setActiveTab] = useState<number>(0)

  if (sections.length === 0) {
    return (
      <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 p-8 text-center text-muted-foreground shadow-sm">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500 animate-pulse" />
        <p className="text-xs">Chưa có nội dung để xem trước. Vui lòng thiết lập ít nhất 1 phần thi.</p>
      </div>
    )
  }

  const activeSection = sections[activeTab] || sections[0]

  return (
    <div className="space-y-4">
      {/* Tab select section */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))]/30 pb-3">
        {sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
              activeTab === idx
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35 shadow-md'
                : 'border-[hsl(var(--border))]/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {/* Render based on test skill */}
      {test.skill === 'reading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Passage content left */}
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))]/50 h-[500px] overflow-y-auto prose prose-invert select-none shadow-sm">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">{activeSection.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: activeSection.passage_content || '' }} />
          </div>

          {/* Question preview right */}
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))]/30 h-[500px] overflow-y-auto space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-cyan-400 border-b border-[hsl(var(--border))]/30 pb-2 font-semibold">Học sinh trả lời các câu hỏi sau:</h3>
            
            {(!activeSection.questions || activeSection.questions.length === 0) ? (
              <p className="text-xs text-muted-foreground italic text-center py-12">Phần này chưa được thêm câu hỏi.</p>
            ) : (
              activeSection.questions.map((q) => (
                <div key={q.id} className="p-4 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400">Câu {q.question_number}</span>
                    <span className="text-muted-foreground font-semibold uppercase">{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground">{q.question_text}</p>
                  
                  {q.question_type === 'multiple_choice' && q.options && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt: any, i: number) => (
                        <div key={i} className="p-2 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))]/40 text-muted-foreground">
                          <span className="font-bold mr-1 text-foreground">{opt.key || String.fromCharCode(65 + i)}.</span>
                          {opt.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 text-[10px] text-muted-foreground flex gap-3 border-t border-[hsl(var(--border))]/30">
                    <span className="text-emerald-400"><strong>Đáp án đúng:</strong> {q.correct_answer}</span>
                    {q.explanation && <span><strong>Giải thích:</strong> {q.explanation}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {test.skill === 'listening' && (
        <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))]/50 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 p-4 bg-[hsl(var(--background))] border border-[hsl(var(--border))]/60 rounded-xl">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg">
              <Headphones className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">File âm thanh bài nghe</span>
              <p className="text-sm font-semibold text-foreground mt-0.5">{activeSection.title}</p>
            </div>
            
            {activeSection.audio_url ? (
              <audio src={activeSection.audio_url} controls className="w-[300px]" controlsList="nodownload" />
            ) : (
              <span className="text-xs text-red-400 italic">Chưa thiết lập âm thanh</span>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-violet-400 border-b border-[hsl(var(--border))]/30 pb-2">Danh sách câu hỏi:</h3>
            {(!activeSection.questions || activeSection.questions.length === 0) ? (
              <p className="text-xs text-muted-foreground italic text-center py-12">Phần này chưa được thêm câu hỏi.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSection.questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-violet-400">Câu {q.question_number}</span>
                      <span className="text-muted-foreground font-semibold uppercase">{QUESTION_TYPE_LABELS[q.question_type] || q.question_type}</span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">{q.question_text}</p>
                    
                    <div className="pt-2 text-[10px] text-muted-foreground flex gap-3 border-t border-[hsl(var(--border))]/30">
                      <span className="text-emerald-400"><strong>Đáp án đúng:</strong> {q.correct_answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {test.skill === 'writing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))]/50 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-2">
              <span className="text-xs font-semibold text-orange-400 uppercase">
                {activeSection.writing_task_type === 'task1' ? 'Writing Task 1' : 'Writing Task 2'}
              </span>
              <span className="text-[11px] text-muted-foreground">Yêu cầu từ tối thiểu: {activeSection.min_words} từ</span>
            </div>
            
            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
              {activeSection.writing_prompt}
            </p>

            {activeSection.writing_image_url && (
              <div className="border border-[hsl(var(--border))]/60 rounded-xl overflow-hidden bg-[hsl(var(--muted))]/10 p-2 flex items-center justify-center">
                <img src={activeSection.writing_image_url} alt="Writing Chart" className="max-h-[220px] object-contain rounded-lg" />
              </div>
            )}
          </div>

          <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-6 bg-[hsl(var(--card))]/30 flex flex-col justify-between h-full min-h-[300px] shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Học sinh soạn bài viết</span>
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-0.5"><Sparkles className="w-3.5 h-3.5" /> Chấm điểm bởi AI</span>
              </div>
              <div className="border border-[hsl(var(--border))]/60 rounded-xl bg-[hsl(var(--background))] p-4 min-h-[200px] text-xs text-muted-foreground font-mono">
                Thí sinh sẽ nhập câu trả lời trực tiếp tại đây...
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground pt-4">
              0 từ
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
