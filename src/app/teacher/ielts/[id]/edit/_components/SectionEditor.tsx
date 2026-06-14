"use client"

import React, { useState } from 'react'
import { Plus, Trash2, Edit, Save, X, Play, Music, AlignLeft, Image } from 'lucide-react'
import { IeltsTest, IeltsSection, IeltsSkill } from '@/types'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface SectionEditorProps {
  test: IeltsTest
  sections: IeltsSection[]
  onAddSection: (sectionData: any) => Promise<boolean>
  onUpdateSection: (sectionId: string, sectionData: any) => Promise<boolean>
  onDeleteSection: (sectionId: string) => Promise<boolean>
  onSelectSection: (section: IeltsSection) => void
}

export function SectionEditor({
  test,
  sections,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onSelectSection
}: SectionEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newOrderIndex, setNewOrderIndex] = useState(1)
  const [deleteSection, setDeleteSection] = useState<IeltsSection | null>(null)

  // Điền dữ liệu mặc định cho các phần thi mới dựa vào skill
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const success = await onAddSection({
      title: newTitle.trim(),
      order_index: newOrderIndex,
      // Dữ liệu trống mặc định
      passage_content: test.skill === 'reading' ? '<p>Nhập nội dung bài đọc ở đây...</p>' : null,
      audio_source: test.skill === 'listening' ? 'youtube' : null,
      audio_url: test.skill === 'listening' ? '' : null,
      writing_task_type: test.skill === 'writing' ? (sections.length === 0 ? 'task1' : 'task2') : null,
      writing_prompt: test.skill === 'writing' ? 'Nhập đề bài ở đây...' : null,
      min_words: test.skill === 'writing' ? (sections.length === 0 ? 150 : 250) : null
    })

    if (success) {
      setNewTitle('')
      setNewOrderIndex(sections.length + 2)
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Các phần thi (Sections / Passages / Tasks)</h3>
          <p className="text-xs text-muted-foreground">Thiết lập nội dung chính cho từng phần của bài thi.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true)
              setNewOrderIndex(sections.length + 1)
            }}
            className="px-4 py-1.5 text-xs font-semibold rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-1 transition-all active:scale-95 shadow-md border-0"
          >
            <Plus className="h-4 w-4" /> Thêm phần mới
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3 shadow-md">
          <h4 className="text-xs font-bold text-cyan-400 uppercase">Thêm phần mới</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề phần *</label>
              <input
                type="text"
                required
                placeholder="VD: Passage 1 / Section 1 / Task 1"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Thứ tự hiển thị *</label>
              <input
                type="number"
                required
                min={1}
                value={newOrderIndex}
                onChange={e => setNewOrderIndex(Number(e.target.value))}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-xs text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-1.5 text-xs rounded-full border border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/20 hover:text-foreground transition-all bg-transparent"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md active:scale-95"
            >
              Tạo phần
            </button>
          </div>
        </form>
      )}

      {/* Danh sách các phần hiện tại */}
      {sections.length === 0 ? (
        <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 p-8 text-center text-muted-foreground shadow-sm">
          <AlignLeft className="h-8 w-8 mx-auto mb-2 opacity-35" />
          <p className="text-xs">Chưa có phần thi nào. Hãy nhấn &quot;Thêm phần mới&quot; để thiết lập nội dung.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/10 transition-all flex items-center justify-between gap-4 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[hsl(var(--muted))]/20 border border-[hsl(var(--border))]/60 flex items-center justify-center font-bold text-xs text-muted-foreground">
                  #{sec.order_index}
                </div>
                <div>
                  <span className="font-semibold text-sm text-foreground block">{sec.title}</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {test.skill === 'reading' && (
                      <>
                        <AlignLeft className="h-3 w-3" /> 
                        {sec.passage_content ? `${sec.passage_content.replace(/<[^>]*>/g, '').substring(0, 60)}...` : 'Chưa có nội dung bài đọc'}
                      </>
                    )}
                    {test.skill === 'listening' && (
                      <>
                        <Music className="h-3 w-3" />
                        {sec.audio_source === 'youtube' ? 'YouTube link' : sec.audio_source === 'upload' ? 'File tải lên' : 'Không có audio'}
                      </>
                    )}
                    {test.skill === 'writing' && (
                      <>
                        <Edit className="h-3 w-3" />
                        {sec.writing_task_type === 'task1' ? 'Task 1 (Mô tả biểu đồ)' : 'Task 2 (Nghị luận)'}
                        {sec.writing_image_url && <span className="text-cyan-400 text-[10px] bg-cyan-400/10 px-1 rounded flex items-center gap-0.5"><Image className="w-2.5 h-2.5" /> Có hình ảnh</span>}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectSection(sec)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-full bg-transparent border border-[hsl(var(--border))]/60 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
                >
                  Thiết lập nội dung
                </button>
                <button
                  onClick={() => setDeleteSection(sec)}
                  className="p-2 rounded-full text-muted-foreground hover:text-red-400 hover:bg-[hsl(var(--muted))]/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleteSection}
        onClose={() => setDeleteSection(null)}
        onConfirm={async () => {
          if (deleteSection) {
            await onDeleteSection(deleteSection.id)
          }
        }}
        title="Xóa phần thi"
        description={`Bạn có chắc chắn muốn xóa phần "${deleteSection?.title || ""}" cùng toàn bộ câu hỏi bên trong?`}
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </div>
  )
}
