"use client"

import React, { useState } from 'react'
import { X, Loader2, ClipboardList, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IeltsQuestionInput } from '@/types'

interface BulkImportModalProps {
  sectionId: string
  onClose: () => void
  onSave: (data: IeltsQuestionInput[]) => Promise<boolean>
  suggestedStartNumber: number
}

export function BulkImportModal({
  sectionId,
  onClose,
  onSave,
  suggestedStartNumber
}: BulkImportModalProps) {
  const [importMode, setImportMode] = useState<'answers' | 'full'>('answers')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      setError('Vui lòng nhập nội dung dữ liệu cần import.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const lines = text.split('\n')
      const questions: IeltsQuestionInput[] = []
      let currentNum = suggestedStartNumber

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        if (importMode === 'answers') {
          // MODE 1: Fast Answer Sheet Mode (1. A, 2. True, etc.)
          // Regex to match "1. A" or "1: A" or "1 - A" or "1 A"
          const match = line.match(/^(\d+)[\.\:\-\s]+(.*)$/)
          let num = currentNum
          let answerText = line

          if (match) {
            num = parseInt(match[1], 10)
            answerText = match[2].trim()
            currentNum = num + 1
          } else {
            // If no number matched, auto-increment based on last seen number
            num = currentNum
            currentNum++
          }

          if (!answerText) continue

          // Detect IELTS Question Type based on answer pattern
          let type: 'multiple_choice' | 'true_false_ng' | 'yes_no_ng' | 'fill_blank' = 'fill_blank'
          let options: any = null
          let cleanAnswer = answerText
          const lowerAns = answerText.toLowerCase()

          if (/^[a-d]$/i.test(lowerAns)) {
            type = 'multiple_choice'
            cleanAnswer = answerText.toUpperCase()
            options = [
              { key: 'A', text: 'Lựa chọn A' },
              { key: 'B', text: 'Lựa chọn B' },
              { key: 'C', text: 'Lựa chọn C' },
              { key: 'D', text: 'Lựa chọn D' }
            ]
          } else if (['true', 'false', 'not given', 'tf', 'ng'].includes(lowerAns)) {
            type = 'true_false_ng'
            if (lowerAns === 'tf' || lowerAns === 'true') cleanAnswer = 'True'
            else if (lowerAns === 'false') cleanAnswer = 'False'
            else cleanAnswer = 'Not Given'
          } else if (['yes', 'no', 'y', 'n'].includes(lowerAns)) {
            type = 'yes_no_ng'
            if (lowerAns === 'yes' || lowerAns === 'y') cleanAnswer = 'Yes'
            else if (lowerAns === 'no' || lowerAns === 'n') cleanAnswer = 'No'
            else cleanAnswer = 'Not Given'
          } else {
            type = 'fill_blank'
          }

          questions.push({
            section_id: sectionId,
            question_number: num,
            question_type: type as any,
            question_text: `Câu hỏi số ${num}`,
            correct_answer: cleanAnswer,
            options: options || undefined
          })

        } else {
          // MODE 2: Full Delimited Mode (Type | Question Text | Options | Correct Answer | Explanation)
          // Format: type | question_text | options (separated by commas) | correct_answer | explanation
          const parts = line.split('|').map(p => p.trim())
          if (parts.length < 3) {
            throw new Error(`Dòng thứ ${i + 1} không đúng định dạng. Cần tối thiểu 3 trường phân tách bằng dấu '|'.`)
          }

          const qType = parts[0].toLowerCase()
          const qText = parts[1]
          const rawOptions = parts[2]
          const qAnswer = parts[3] || ''
          const qExplanation = parts[4] || undefined

          // Map shorthand types
          let type = qType
          if (type === 'mc' || type === 'multiple') type = 'multiple_choice'
          if (type === 'tf' || type === 'true_false') type = 'true_false_ng'
          if (type === 'yn' || type === 'yes_no') type = 'yes_no_ng'
          if (type === 'blank' || type === 'fill') type = 'fill_blank'

          const validTypes = ['multiple_choice', 'true_false_ng', 'yes_no_ng', 'fill_blank', 'short_answer', 'sentence_completion']
          if (!validTypes.includes(type)) {
            throw new Error(`Dòng thứ ${i + 1} chứa loại câu hỏi '${parts[0]}' không hợp lệ.`)
          }

          // Parse options if multiple_choice
          let parsedOptions: any = null
          if (type === 'multiple_choice' && rawOptions) {
            parsedOptions = rawOptions.split(',').map(opt => {
              const optMatch = opt.trim().match(/^([A-D])\s*[\:\.\-\s]\s*(.*)$/i)
              if (optMatch) {
                return { key: optMatch[1].toUpperCase(), text: optMatch[2].trim() }
              }
              return opt.trim()
            })
          }

          questions.push({
            section_id: sectionId,
            question_number: currentNum,
            question_type: type as any,
            question_text: qText,
            correct_answer: qAnswer,
            options: parsedOptions || undefined,
            explanation: qExplanation
          })

          currentNum++
        }
      }

      if (questions.length === 0) {
        setError('Không tìm thấy dữ liệu câu hỏi hợp lệ nào. Vui lòng kiểm tra lại.')
        setSaving(false)
        return
      }

      const success = await onSave(questions)
      if (success) {
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích cú pháp dữ liệu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-xl rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[hsl(var(--border))]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-foreground">Nhập câu hỏi hàng loạt</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex px-5 pt-3 gap-1 bg-[hsl(var(--muted))]/10 border-b border-[hsl(var(--border))]/20">
          <button
            type="button"
            onClick={() => { setImportMode('answers'); setError(null) }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              importMode === 'answers' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Tạo nhanh từ đáp án (Answer Sheet)
          </button>
          <button
            type="button"
            onClick={() => { setImportMode('full'); setError(null) }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              importMode === 'full' 
                ? 'border-cyan-500 text-cyan-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Nhập đầy đủ thông tin (Nội dung + Đáp án)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleImport} className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Instruction Panel */}
            <div className="p-3 bg-[hsl(var(--muted))]/20 rounded-xl border border-[hsl(var(--border))]/30 text-[11px] leading-relaxed text-muted-foreground space-y-1.5">
              <span className="font-bold text-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-cyan-400" /> Hướng dẫn định dạng nhập liệu:
              </span>
              {importMode === 'answers' ? (
                <div className="space-y-1">
                  <p>Dán trực tiếp danh sách đáp án để tự động nhận diện loại câu hỏi:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Đáp án dạng chữ đơn (<code className="text-cyan-400 font-bold">A, B, C, D</code>) &rarr; Tạo câu hỏi trắc nghiệm (MCQ).</li>
                    <li>Đáp án dạng True/False (<code className="text-cyan-400 font-bold">True, False, Not Given, TF, NG</code>) &rarr; Tạo câu hỏi True/False/NG.</li>
                    <li>Đáp án dạng Yes/No (<code className="text-cyan-400 font-bold">Yes, No, Y, N</code>) &rarr; Tạo câu hỏi Yes/No/NG.</li>
                    <li>Đáp án khác (<code className="text-cyan-400 font-bold">global warming, 1500, internet</code>) &rarr; Tạo câu hỏi điền từ (Fill Blank).</li>
                  </ul>
                  <p className="mt-1 font-bold text-[10px] text-foreground">Ví dụ định dạng:</p>
                  <pre className="bg-black/30 p-2 rounded text-[10px] font-mono text-cyan-300">
                    1. A{"\n"}
                    2. True{"\n"}
                    3. Not Given{"\n"}
                    4. global warming{"\n"}
                    5. C
                  </pre>
                </div>
              ) : (
                <div className="space-y-1">
                  <p>Mỗi dòng là một câu hỏi phân tách bằng dấu gạch đứng <code className="text-cyan-400">|</code>:</p>
                  <p className="font-mono text-[9.5px] bg-black/30 p-1.5 rounded text-cyan-300">
                    Loại câu hỏi | Nội dung câu hỏi | Các lựa chọn (cách nhau bằng dấu phẩy) | Đáp án đúng | Giải thích
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Loại câu hỏi hợp lệ: <code className="text-foreground">mc</code>, <code className="text-foreground">tf</code>, <code className="text-foreground">yn</code>, <code className="text-foreground">blank</code>.</li>
                    <li>Các lựa chọn chỉ cần thiết cho loại <code className="text-foreground">mc</code>. Định dạng: <code className="text-foreground">A: Text A, B: Text B...</code>.</li>
                  </ul>
                  <p className="mt-1 font-bold text-[10px] text-foreground">Ví dụ định dạng:</p>
                  <pre className="bg-black/30 p-2 rounded text-[9px] font-mono text-cyan-300 overflow-x-auto">
                    mc | What color is the sky? | A: Blue, B: Red, C: Green | A | Because of light scattering.{"\n"}
                    tf | Earth is flat | | False | Earth is a sphere.{"\n"}
                    blank | The capital of France is ___ | | Paris | Paris is the capital.
                  </pre>
                </div>
              )}
            </div>

            {/* Input Textarea */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Dán nội dung vào đây</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={importMode === 'answers' ? "1. A\n2. True\n3. global warming..." : "mc | Question text | A: Option A, B: Option B | A | Explanation..."}
                rows={10}
                className="w-full rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-3 text-xs text-foreground font-mono focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/35"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-6 border-t border-[hsl(var(--border))]/20 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/70 bg-transparent text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all h-auto"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving || !text.trim()}
              className="px-5 py-2.5 text-xs font-semibold rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:pointer-events-none border-0 h-auto"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Import ngay ({text.split('\n').filter(l => l.trim()).length} dòng)
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
