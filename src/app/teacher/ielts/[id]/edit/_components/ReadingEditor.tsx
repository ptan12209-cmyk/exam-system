"use client"

import React, { useState, useEffect } from 'react'
import { Save, X, Eye, HelpCircle, Code, AlignLeft } from 'lucide-react'
import { IeltsSection } from '@/types'

interface ReadingEditorProps {
  section: IeltsSection
  onSave: (sectionId: string, data: any) => Promise<boolean>
  onClose: () => void
}

export function ReadingEditor({ section, onSave, onClose }: ReadingEditorProps) {
  const [title, setTitle] = useState(section.title)
  const [content, setContent] = useState(section.passage_content || '')
  const [orderIndex, setOrderIndex] = useState(section.order_index)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    setTitle(section.title)
    setContent(section.passage_content || '')
    setOrderIndex(section.order_index)
  }, [section])

  const handleInsertTag = (tag: string, closeTag = '') => {
    const textarea = document.getElementById('passage-textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    
    let replacement = ''
    if (closeTag) {
      replacement = `<${tag}>${selected || 'văn bản'}</${closeTag}>`
    } else {
      replacement = `<${tag}>`
    }

    const nextContent = text.substring(0, start) + replacement + text.substring(end)
    setContent(nextContent)
    
    // Focus back and set selection
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + (selected || 'văn bản').length)
    }, 50)
  }

  const handleSave = async () => {
    setSaving(true)
    const success = await onSave(section.id, {
      title: title.trim(),
      passage_content: content,
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
          <span className="text-xs font-semibold text-cyan-400 uppercase">Thiết lập Passage bài đọc</span>
          <h4 className="text-base font-bold text-foreground mt-0.5">{section.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full border flex items-center gap-1 transition-all ${
              showPreview 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/35 shadow-md' 
                : 'border-[hsl(var(--border))]/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20'
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> {showPreview ? 'Chỉnh sửa' : 'Xem trước'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề Passage *</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Thứ tự *</label>
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

      {showPreview ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase block">Bản xem trước hiển thị ở Split-screen</label>
          <div className="border border-[hsl(var(--border))]/60 rounded-xl bg-[hsl(var(--muted))]/10 p-6 min-h-[300px] overflow-y-auto max-h-[500px] prose prose-invert max-w-none text-sm leading-relaxed text-foreground select-none">
            <h2 className="text-xl font-bold text-center mb-6 text-foreground">{title}</h2>
            <div 
              dangerouslySetInnerHTML={{ __html: content || '<p className="text-muted-foreground italic text-center">Chưa có nội dung bài đọc. Chọn chế độ Chỉnh sửa để thêm văn bản.</p>' }} 
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase block">Nội dung bài đọc (Hỗ trợ HTML)</label>
            {/* Quick HTML formatting toolbar */}
            <div className="flex flex-wrap gap-1 bg-[hsl(var(--muted))]/20 p-1 rounded-lg border border-[hsl(var(--border))]/30">
              <button 
                type="button" 
                onClick={() => handleInsertTag('b', 'b')}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="Bold"
              >
                B
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('i', 'i')}
                className="px-2 py-0.5 text-[10px] italic rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="Italic"
              >
                I
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('p', 'p')}
                className="px-2 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="Paragraph"
              >
                Paragraph
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('h3', 'h3')}
                className="px-2 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground font-semibold"
                title="Subheading"
              >
                H3
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('br')}
                className="px-2 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="Line Break"
              >
                Break
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('ul', 'ul')}
                className="px-2 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="Bullet List"
              >
                UL List
              </button>
              <button 
                type="button" 
                onClick={() => handleInsertTag('li', 'li')}
                className="px-2 py-0.5 text-[10px] rounded bg-[hsl(var(--muted))]/40 hover:bg-[hsl(var(--muted))]/70 text-foreground"
                title="List Item"
              >
                Item
              </button>
            </div>
          </div>
          
          <textarea
            id="passage-textarea"
            rows={12}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Viết hoặc dán nội dung bài đọc ở đây. Bạn có thể sử dụng các thẻ HTML như <p>, <h3>, <b>, <ul>, <li> để trình bày định dạng rõ ràng cho học sinh đọc."
            className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
          />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-[hsl(var(--muted))]/10 p-3 rounded-xl border border-[hsl(var(--border))]/30 leading-relaxed">
            <HelpCircle className="h-4.5 w-4.5 text-cyan-400 shrink-0" />
            <span>
              <strong>Mẹo định dạng</strong>: Dùng <code>&lt;h3&gt;Tiêu đề đoạn&lt;/h3&gt;</code> cho tiêu đề mục, và kẹp mỗi đoạn văn trong cặp thẻ <code>&lt;p&gt;Nội dung...&lt;/p&gt;</code> để căn lề đẹp nhất khi hiển thị.
            </span>
          </div>
        </div>
      )}

      {/* Footer buttons */}
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
          disabled={saving}
          className="px-5 py-2 text-xs font-semibold rounded-full bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Save className="h-4 w-4" /> Lưu cấu hình
        </button>
      </div>
    </div>
  )
}
