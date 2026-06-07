"use client"

import React from 'react'
import { IeltsQuestion } from '@/types'

interface QuestionRendererProps {
  question: IeltsQuestion
  value: string // Giá trị đáp án đã chọn/nhập hiện tại
  onChange: (value: string) => void
}

export const QuestionRenderer = React.memo(function QuestionRenderer(
  { question, value = '', onChange }: QuestionRendererProps
) {
  const qType = question.question_type

  // 1. Trắc nghiệm (Multiple Choice)
  if (qType === 'multiple_choice') {
    const options = Array.isArray(question.options) ? question.options : []
    return (
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          <span className="text-cyan-400 font-bold mr-1.5">Câu {question.question_number}:</span>
          {question.question_text}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
          {options.map((opt: { key?: string; text?: string } | string, idx: number) => {
            const key = (typeof opt === 'object' && opt ? opt.key : null) || String.fromCharCode(65 + idx)
            const text = String((typeof opt === 'object' && opt ? opt.text : opt) || '')
            const isSelected = value === key

            
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md ring-1 ring-cyan-500/20'
                    : 'border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 text-muted-foreground hover:bg-[hsl(var(--muted))]/30 hover:border-[hsl(var(--border))] hover:text-foreground'
                }`}
              >
                <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-extrabold border ${
                  isSelected 
                    ? 'bg-cyan-50 border-transparent text-cyan-950 font-black' 
                    : 'bg-[hsl(var(--muted))]/30 border-[hsl(var(--border))]/50'
                }`}>
                  {key}
                </span>
                <span className="leading-relaxed">{text}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 2. True / False / Not Given
  if (qType === 'true_false_ng') {
    const options = ['True', 'False', 'Not Given']
    return (
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          <span className="text-cyan-400 font-bold mr-1.5">Câu {question.question_number}:</span>
          {question.question_text}
        </p>
        <div className="flex flex-wrap gap-2 pl-4">
          {options.map((opt) => {
            const isSelected = value === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 text-muted-foreground hover:bg-[hsl(var(--muted))]/30 hover:border-[hsl(var(--border))] hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 3. Yes / No / Not Given
  if (qType === 'yes_no_ng') {
    const options = ['Yes', 'No', 'Not Given']
    return (
      <div className="space-y-2.5">
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          <span className="text-cyan-400 font-bold mr-1.5">Câu {question.question_number}:</span>
          {question.question_text}
        </p>
        <div className="flex flex-wrap gap-2 pl-4">
          {options.map((opt) => {
            const isSelected = value === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 text-muted-foreground hover:bg-[hsl(var(--muted))]/30 hover:border-[hsl(var(--border))] hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 4. Các dạng tự điền từ (fill_blank, short_answer, sentence_completion, diagram_label, heading_match)
  // Renders a sleek input text field
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-relaxed flex-1">
          <span className="text-cyan-400 font-bold mr-1.5">Câu {question.question_number}:</span>
          {question.question_text}
        </p>
        
        <div className="w-full sm:w-[260px] pl-4 sm:pl-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập câu trả lời..."
            className="w-full rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
        </div>
      </div>
    </div>
  )
})
