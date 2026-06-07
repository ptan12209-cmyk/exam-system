"use client"

import React, { useState } from 'react'
import { Plus, Edit2, Trash2, HelpCircle, ListFilter, AlertCircle, ClipboardList } from 'lucide-react'
import { IeltsTest, IeltsSection, IeltsQuestion } from '@/types'
import { QUESTION_TYPE_LABELS } from '@/lib/ielts'
import { QuestionForm } from './QuestionForm'
import { BulkImportModal } from './BulkImportModal'

// QuestionEditor handles listing, editing and deleting questions within a section.
interface QuestionEditorProps {
  test: IeltsTest
  sections: IeltsSection[]
  onAddQuestion: (questionData: any) => Promise<boolean>
  onUpdateQuestion: (questionId: string, questionData: any) => Promise<boolean>
  onDeleteQuestion: (questionId: string) => Promise<boolean>
}

export function QuestionEditor({
  test,
  sections,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion
}: QuestionEditorProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sections.length > 0 ? sections[0].id : ''
  )
  const [editingQuestion, setEditingQuestion] = useState<IeltsQuestion | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isBulkAdding, setIsBulkAdding] = useState(false)

  const currentSection = sections.find(s => s.id === selectedSectionId)
  const questions = currentSection?.questions || []

  // Lấy question_number tiếp theo gợi ý
  const getNextQuestionNumber = () => {
    if (questions.length === 0) {
      // Tìm số câu hỏi lớn nhất ở các sections trước để tạo số nối tiếp
      let maxNum = 0
      sections.forEach(s => {
        if (s.id !== selectedSectionId && s.questions) {
          s.questions.forEach(q => {
            if (q.question_number > maxNum) maxNum = q.question_number
          })
        }
      })
      return maxNum + 1
    }
    return Math.max(...questions.map(q => q.question_number)) + 1
  }

  const handleDelete = async (qId: string, qNum: number) => {
    if (confirm(`Bạn có chắc muốn xóa câu hỏi số ${qNum}?`)) {
      await onDeleteQuestion(qId)
    }
  }

  if (sections.length === 0) {
    return (
      <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 p-8 text-center text-muted-foreground shadow-sm">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
        <p className="text-xs">Vui lòng tạo ít nhất một phần thi (Section/Passage) trước khi thêm câu hỏi.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chọn section để quản lý câu hỏi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--card))]/50 p-4 rounded-[2rem] border border-[hsl(var(--border))]/60 shadow-sm">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4.5 w-4.5 text-cyan-400" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Quản lý câu hỏi của phần:</span>
          <select
            value={selectedSectionId}
            onChange={e => setSelectedSectionId(e.target.value)}
            className="rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-cyan-500/50 cursor-pointer transition-all"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.questions?.length || 0} câu hỏi)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkAdding(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/70 bg-transparent text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/25 flex items-center gap-1 transition-all active:scale-95"
          >
            <ClipboardList className="h-4 w-4 text-cyan-400" /> Nhập hàng loạt
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-1.5 text-xs font-semibold rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-1 transition-all active:scale-95 shadow-md border-0"
          >
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* Hiển thị list câu hỏi trong section */}
      {questions.length === 0 ? (
        <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 p-12 text-center text-muted-foreground shadow-sm">
          <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-35" />
          <p className="text-xs">Phần thi này chưa có câu hỏi nào. Hãy nhấn &quot;Thêm câu hỏi&quot; để thiết lập đáp án.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-sm"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    Câu {q.question_number}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {QUESTION_TYPE_LABELS[q.question_type] || q.question_type}
                  </span>
                </div>
                
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  {q.question_text}
                </p>

                {/* Hiển thị Options nếu có (MC hoặc Matching) */}
                {q.options && typeof q.options === 'object' && (
                  <div className="text-xs text-muted-foreground space-y-0.5 pl-4 border-l border-[hsl(var(--border))]/40">
                    {Array.isArray(q.options) ? (
                      q.options.map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-1">
                          <span className="font-bold">{opt.key || String.fromCharCode(65 + idx)}.</span>
                          <span>{opt.text || opt}</span>
                        </div>
                      ))
                    ) : (
                      Object.entries(q.options).map(([key, val]: any) => (
                        <div key={key} className="flex items-start gap-1">
                          <span className="font-bold">{key}:</span>
                          <span>{val}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-emerald-400">
                    <strong>Đáp án đúng:</strong> {q.correct_answer}
                  </span>
                  {q.explanation && (
                    <span className="text-muted-foreground line-clamp-1 max-w-[400px]">
                      <strong>Giải thích:</strong> {q.explanation}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-[hsl(var(--border))]/30 shrink-0">
                <button
                  onClick={() => setEditingQuestion(q)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-cyan-400 hover:bg-[hsl(var(--muted))]/20 transition-all"
                  title="Chỉnh sửa câu hỏi"
                >
                  <Edit2 className="h-4 w-4 text-cyan-400" />
                </button>
                <button
                  onClick={() => handleDelete(q.id, q.question_number)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-[hsl(var(--muted))]/20 transition-all"
                  title="Xóa câu hỏi"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal tạo mới câu hỏi */}
      {isAdding && (
        <QuestionForm
          sectionId={selectedSectionId}
          suggestedNumber={getNextQuestionNumber()}
          onClose={() => setIsAdding(false)}
          onSave={onAddQuestion}
        />
      )}

      {/* Form modal chỉnh sửa câu hỏi */}
      {editingQuestion && (
        <QuestionForm
          sectionId={selectedSectionId}
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={async (data: any) => {
            const success = await onUpdateQuestion(editingQuestion.id, data)
            if (success) setEditingQuestion(null)
            return success
          }}
        />
      )}

      {/* Form modal nhập hàng loạt câu hỏi */}
      {isBulkAdding && (
        <BulkImportModal
          sectionId={selectedSectionId}
          suggestedStartNumber={getNextQuestionNumber()}
          onClose={() => setIsBulkAdding(false)}
          onSave={onAddQuestion}
        />
      )}
    </div>
  )
}
