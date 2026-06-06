"use client"

import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { IeltsSkill, IeltsTestStatus } from '@/types'
import { STANDARD_DURATIONS } from '@/lib/ielts'

interface CreateTestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (testId: string) => void
}

export function CreateTestModal({ isOpen, onClose, onSuccess }: CreateTestModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skill, setSkill] = useState<IeltsSkill>('reading')
  const [timerMode, setTimerMode] = useState<'standard' | 'custom'>('standard')
  const [duration, setDuration] = useState<number>(60)
  const [status, setStatus] = useState<IeltsTestStatus>('draft')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Khi thay đổi kỹ năng, tự động cập nhật thời gian chuẩn nếu là chế độ standard
  const handleSkillChange = (newSkill: IeltsSkill) => {
    setSkill(newSkill)
    if (timerMode === 'standard') {
      setDuration(STANDARD_DURATIONS[newSkill])
    }
  }

  const handleTimerModeChange = (mode: 'standard' | 'custom') => {
    setTimerMode(mode)
    if (mode === 'standard') {
      setDuration(STANDARD_DURATIONS[skill])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Tiêu đề không được để trống')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ielts/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          skill,
          timer_mode: timerMode,
          duration: timerMode === 'custom' ? Number(duration) : undefined,
          status
        })
      })

      const json = await response.json()
      if (json.success) {
        onSuccess(json.data.id)
        onClose()
      } else {
        setError(json.error?.message || 'Không thể tạo đề thi mới')
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi mạng, vui lòng thử lại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="glass-card w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Tạo đề thi IELTS mới</h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề đề thi *</label>
            <input
              type="text"
              required
              placeholder="VD: Cambridge IELTS 18 - Academic Test 1"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Mô tả chi tiết</label>
            <textarea
              placeholder="Nhập mô tả đề thi (nguồn đề, mức độ khó, ghi chú...)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Kỹ năng thi *</label>
              <select
                value={skill}
                onChange={e => handleSkillChange(e.target.value as IeltsSkill)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none transition-all cursor-pointer [&>option]:bg-neutral-900"
              >
                <option value="reading">Reading (Đọc)</option>
                <option value="listening">Listening (Nghe)</option>
                <option value="writing">Writing (Viết)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Trạng thái ban đầu</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as IeltsTestStatus)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none transition-all cursor-pointer [&>option]:bg-neutral-900"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="published">Xuất bản (Published)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Chế độ thời gian *</label>
              <select
                value={timerMode}
                onChange={e => handleTimerModeChange(e.target.value as 'standard' | 'custom')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none transition-all cursor-pointer [&>option]:bg-neutral-900"
              >
                <option value="standard">Standard (Chuẩn IELTS)</option>
                <option value="custom">Custom (Tùy chỉnh)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                Thời gian làm bài ({timerMode === 'standard' ? 'Cố định' : 'Phút'}) *
              </label>
              <input
                type="number"
                required
                min={1}
                disabled={timerMode === 'standard'}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground focus:border-cyan-500/50 focus:outline-none disabled:opacity-60 transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo bài test
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
