"use client"

import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { IeltsQuestion, IeltsQuestionType } from '@/types'
import { QUESTION_TYPE_LABELS } from '@/lib/ielts'

interface QuestionFormProps {
  sectionId: string
  question?: IeltsQuestion
  suggestedNumber?: number
  onClose: () => void
  onSave: (data: any) => Promise<boolean>
}

export function QuestionForm({
  sectionId,
  question,
  suggestedNumber,
  onClose,
  onSave
}: QuestionFormProps) {
  const [qNumber, setQNumber] = useState<number>(suggestedNumber || 1)
  const [qType, setQType] = useState<IeltsQuestionType>('multiple_choice')
  const [qText, setQText] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  
  // Trạng thái các lựa chọn trắc nghiệm
  const [mcOptions, setMcOptions] = useState<Array<{ key: string; text: string }>>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (question) {
      setQNumber(question.question_number)
      setQType(question.question_type)
      setQText(question.question_text)
      setCorrectAnswer(question.correct_answer)
      setExplanation(question.explanation || '')
      
      // Parse options nếu có
      if (question.options && Array.isArray(question.options)) {
        setMcOptions(question.options)
      }
    } else if (suggestedNumber) {
      setQNumber(suggestedNumber)
    }
  }, [question, suggestedNumber])

  // Tự động thiết lập đáp án mặc định khi chuyển qua T/F/NG
  const handleTypeChange = (newType: IeltsQuestionType) => {
    setQType(newType)
    if (newType === 'true_false_ng') {
      setCorrectAnswer('True')
    } else if (newType === 'yes_no_ng') {
      setCorrectAnswer('Yes')
    } else {
      setCorrectAnswer('')
    }
  }

  const handleOptionChange = (index: number, val: string) => {
    setMcOptions(prev => {
      const next = [...prev]
      next[index].text = val
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qText.trim()) {
      setError('Nội dung câu hỏi không được để trống')
      return
    }
    if (!correctAnswer.trim()) {
      setError('Vui lòng điền đáp án đúng')
      return
    }

    setSaving(true)
    setError(null)

    // Chuẩn bị options
    let finalOptions: any = null
    if (qType === 'multiple_choice') {
      // Đảm bảo các options trắc nghiệm không bị trống
      const blankOpts = mcOptions.filter(o => !o.text.trim())
      if (blankOpts.length > 0) {
        setError('Vui lòng nhập đầy đủ nội dung cho các lựa chọn trắc nghiệm')
        setSaving(false)
        return
      }
      finalOptions = mcOptions
    }

    const payload = {
      section_id: sectionId,
      question_number: Number(qNumber),
      question_type: qType,
      question_text: qText.trim(),
      options: finalOptions,
      correct_answer: correctAnswer.trim(),
      explanation: explanation.trim() || undefined
    }

    const success = await onSave(payload)
    setSaving(false)
    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-lg rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[hsl(var(--border))]/20 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {question ? `Sửa câu hỏi số ${question.question_number}` : 'Thêm câu hỏi mới'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-3.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Số thứ tự *</label>
              <input
                type="number"
                required
                min={1}
                value={qNumber}
                onChange={e => setQNumber(Number(e.target.value))}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Loại câu hỏi *</label>
              <select
                value={qType}
                onChange={e => handleTypeChange(e.target.value as IeltsQuestionType)}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 cursor-pointer [&>option]:bg-[hsl(var(--card))]"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nội dung câu hỏi *</label>
            <textarea
              required
              rows={2}
              placeholder="VD: What is the main purpose of the study?"
              value={qText}
              onChange={e => setQText(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Cấu hình trắc nghiệm (Options) */}
          {qType === 'multiple_choice' && (
            <div className="space-y-2.5 bg-[hsl(var(--muted))]/10 p-4 rounded-xl border border-[hsl(var(--border))]/30">
              <span className="text-[10px] font-bold text-cyan-400 uppercase block">Thiết lập các lựa chọn</span>
              {mcOptions.map((opt, idx) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <span className="font-bold text-xs text-muted-foreground w-4">{opt.key}.</span>
                  <input
                    type="text"
                    required
                    placeholder={`Nhập nội dung lựa chọn ${opt.key}`}
                    value={opt.text}
                    onChange={e => handleOptionChange(idx, e.target.value)}
                    className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Đáp án đúng */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Đáp án đúng (Correct Answer) *</label>
            {qType === 'true_false_ng' ? (
              <select
                value={correctAnswer}
                onChange={e => setCorrectAnswer(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all [&>option]:bg-[hsl(var(--card))]"
              >
                <option value="True">True</option>
                <option value="False">False</option>
                <option value="Not Given">Not Given</option>
              </select>
            ) : qType === 'yes_no_ng' ? (
              <select
                value={correctAnswer}
                onChange={e => setCorrectAnswer(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all [&>option]:bg-[hsl(var(--card))]"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Not Given">Not Given</option>
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder={
                  qType === 'multiple_choice' 
                    ? 'Nhập A, B, C hoặc D' 
                    : 'Nhập câu trả lời đúng (Không phân biệt hoa thường, VD: internet / global warming)'
                }
                value={correctAnswer}
                onChange={e => setCorrectAnswer(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            )}
          </div>

          {/* Giải thích đáp án */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Giải thích đáp án (Giải thích cho học sinh)</label>
            <textarea
              rows={2}
              placeholder="Nhập phần giải thích tại sao đáp án này đúng..."
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[hsl(var(--border))]/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/20 hover:text-foreground transition-all bg-transparent"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {question ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
