"use client"

import React, { useState, useEffect } from 'react'
import { Save, X, Image as ImageIcon, Upload, Loader2, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { IeltsSection, IeltsWritingTaskType } from '@/types'

interface WritingEditorProps {
  section: IeltsSection
  onSave: (sectionId: string, data: any) => Promise<boolean>
  onClose: () => void
}

export function WritingEditor({ section, onSave, onClose }: WritingEditorProps) {
  const [title, setTitle] = useState(section.title)
  const [orderIndex, setOrderIndex] = useState(section.order_index)
  const [taskType, setTaskType] = useState<IeltsWritingTaskType>(
    (section.writing_task_type as any) || 'task1'
  )
  const [prompt, setPrompt] = useState(section.writing_prompt || '')
  const [minWords, setMinWords] = useState<number>(
    section.min_words || (section.writing_task_type === 'task2' ? 250 : 150)
  )
  const [imageUrl, setImageUrl] = useState(section.writing_image_url || '')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setTitle(section.title)
    setOrderIndex(section.order_index)
    setTaskType((section.writing_task_type as any) || 'task1')
    setPrompt(section.writing_prompt || '')
    setMinWords(section.min_words || (section.writing_task_type === 'task2' ? 250 : 150))
    setImageUrl(section.writing_image_url || '')
    setError(null)
  }, [section])

  // Khi thay đổi task type, cập nhật min_words mặc định nếu người dùng chưa tự chỉnh sửa sâu
  const handleTaskTypeChange = (type: IeltsWritingTaskType) => {
    setTaskType(type)
    setMinWords(type === 'task2' ? 250 : 150)
  }

  // Upload ảnh đề bài (Task 1 thường cần biểu đồ)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chỉ chọn các tệp hình ảnh (PNG, JPG, JPEG, WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Dung lượng ảnh tối đa cho phép là 8MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `writing-charts/${fileName}`

      const { data, error: uploadError } = await supabase.storage
        .from('ielts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ielts')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
    } catch (err: any) {
      console.error('Lỗi upload image:', err)
      setError(err.message || 'Lỗi tải lên tệp hình ảnh')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!prompt.trim()) {
      setError('Nội dung đề bài không được để trống')
      return
    }

    setSaving(true)
    setError(null)

    const success = await onSave(section.id, {
      title: title.trim(),
      writing_task_type: taskType,
      writing_prompt: prompt.trim(),
      min_words: Number(minWords),
      writing_image_url: imageUrl || null,
      order_index: Number(orderIndex)
    })

    setSaving(false)
    if (success) {
      onClose()
    }
  }

  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 p-6 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-4">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase">Thiết lập đề bài Writing</span>
          <h4 className="text-base font-bold text-foreground mt-0.5">{section.title}</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/5 p-3.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề Task *</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Thứ tự hiển thị *</label>
          <input
            type="number"
            required
            min={1}
            value={orderIndex}
            onChange={e => setOrderIndex(Number(e.target.value))}
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Phân loại Task *</label>
          <select
            value={taskType}
            onChange={e => handleTaskTypeChange(e.target.value as IeltsWritingTaskType)}
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 cursor-pointer [&>option]:bg-[hsl(var(--card))]"
          >
            <option value="task1">Writing Task 1 (Mô tả biểu đồ/sơ đồ)</option>
            <option value="task2">Writing Task 2 (Bài luận nghị luận xã hội)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Số từ tối thiểu yêu cầu *</label>
          <input
            type="number"
            required
            min={1}
            value={minWords}
            onChange={e => setMinWords(Number(e.target.value))}
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      {/* Đề bài viết */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Đề bài (Prompt) *</label>
        <textarea
          required
          rows={6}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Nhập chi tiết đề bài viết IELTS..."
          className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-3 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Hình ảnh đính kèm (cho Task 1) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase block">Hình ảnh sơ đồ, biểu đồ đính kèm (Thường dùng cho Task 1)</label>
        
        {imageUrl ? (
          <div className="relative border border-[hsl(var(--border))]/60 rounded-xl overflow-hidden bg-[hsl(var(--muted))]/10 p-2 flex flex-col items-center">
            <img 
              src={imageUrl} 
              alt="Writing Chart" 
              className="max-h-[220px] object-contain rounded-xl border border-[hsl(var(--border))]/30" 
            />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-lg transition-all"
            >
              Xóa hình ảnh
            </button>
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-[hsl(var(--border))]/60 rounded-xl p-6 flex flex-col items-center justify-center hover:border-cyan-500/30 hover:bg-[hsl(var(--muted))]/10 transition-all group">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                <span className="text-xs text-muted-foreground">Đang tải ảnh lên...</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground group-hover:text-cyan-400 transition-colors mb-2" />
                <span className="text-xs font-semibold text-foreground">Chọn hình ảnh biểu đồ để tải lên</span>
                <span className="text-[10px] text-muted-foreground mt-1">Hỗ trợ PNG, JPG, JPEG. Tối đa 8MB.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[hsl(var(--border))]/30">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 text-xs font-semibold rounded-full border border-[hsl(var(--border))]/60 text-muted-foreground hover:bg-[hsl(var(--muted))]/20 hover:text-foreground transition-all bg-transparent"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="px-5 py-2 text-xs font-semibold rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <Save className="h-4 w-4" /> Lưu cấu hình
        </button>
      </div>
    </div>
  )
}
