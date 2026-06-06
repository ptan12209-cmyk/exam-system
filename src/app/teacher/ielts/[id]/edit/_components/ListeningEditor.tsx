"use client"

import React, { useState, useEffect } from 'react'
import { Save, X, Music, Youtube, Link as LinkIcon, Upload, Loader2, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { IeltsSection } from '@/types'

interface ListeningEditorProps {
  section: IeltsSection
  onSave: (sectionId: string, data: any) => Promise<boolean>
  onClose: () => void
}

export function ListeningEditor({ section, onSave, onClose }: ListeningEditorProps) {
  const [title, setTitle] = useState(section.title)
  const [orderIndex, setOrderIndex] = useState(section.order_index)
  const [audioSource, setAudioSource] = useState<'upload' | 'youtube' | 'external'>(
    (section.audio_source as any) || 'youtube'
  )
  const [audioUrl, setAudioUrl] = useState(section.audio_url || '')
  
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setTitle(section.title)
    setOrderIndex(section.order_index)
    setAudioSource((section.audio_source as any) || 'youtube')
    setAudioUrl(section.audio_url || '')
    setError(null)
  }, [section])

  // Trích xuất YouTube Video ID từ link bất kỳ
  const parseYoutubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : url
  }

  // Xử lý tải lên file audio trực tiếp lên Supabase Storage
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra định dạng và kích thước (Giới hạn 50MB)
    if (!file.type.startsWith('audio/')) {
      setError('Vui lòng chỉ tải lên file âm thanh (MP3, WAV, M4A,...)')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Dung lượng file audio không được vượt quá 50MB')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(10)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `listening-audios/${fileName}`

      setUploadProgress(30)
      const { data, error: uploadError } = await supabase.storage
        .from('ielts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      setUploadProgress(70)
      const { data: { publicUrl } } = supabase.storage
        .from('ielts')
        .getPublicUrl(filePath)

      setUploadProgress(100)
      setAudioUrl(publicUrl)
    } catch (err: any) {
      console.error('Lỗi upload audio:', err)
      setError(err.message || 'Lỗi tải lên file âm thanh')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(null), 1000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    let finalAudioUrl = audioUrl.trim()
    if (audioSource === 'youtube') {
      // Chỉ lưu video ID hoặc link embed chuẩn hóa
      const videoId = parseYoutubeId(finalAudioUrl)
      if (videoId.length === 11) {
        finalAudioUrl = `https://www.youtube.com/embed/${videoId}`
      }
    }

    const success = await onSave(section.id, {
      title: title.trim(),
      audio_source: audioSource,
      audio_url: finalAudioUrl,
      order_index: Number(orderIndex)
    })
    
    setSaving(false)
    if (success) {
      onClose()
    }
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 bg-neutral-900/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <span className="text-xs font-semibold text-violet-400 uppercase">Cài đặt Audio bài nghe</span>
          <h4 className="text-base font-bold text-foreground mt-0.5">{section.title}</h4>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Tiêu đề phần nghe *</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground focus:outline-none focus:border-violet-500/50"
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
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Chọn Nguồn Audio */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase block mb-2">Nguồn âm thanh (Audio Source)</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'youtube', label: 'YouTube Video', icon: Youtube, color: 'hover:text-red-400 border-red-500/20 bg-red-500/5 text-red-400' },
            { value: 'upload', label: 'Tải Audio lên', icon: Upload, color: 'hover:text-violet-400 border-violet-500/20 bg-violet-500/5 text-violet-400' },
            { value: 'external', label: 'Liên kết ngoài', icon: LinkIcon, color: 'hover:text-cyan-400 border-cyan-500/20 bg-cyan-500/5 text-cyan-400' }
          ].map(opt => {
            const Icon = opt.icon
            const isSelected = audioSource === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setAudioSource(opt.value as any)
                  setAudioUrl('')
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-medium ${
                  isSelected 
                    ? opt.color + ' border-current'
                    : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <Icon className="h-5 w-5" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Vùng điều khiển nhập liệu tương ứng */}
      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
        {audioSource === 'youtube' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase block">Đường dẫn YouTube Video</label>
            <input
              type="text"
              placeholder="Dán link youtube vào đây (VD: https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-red-500/50"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              * Hệ thống sẽ tự động chuyển đổi thành mã nhúng dạng bảo mật không chứa quảng cáo và thanh điều khiển YouTube.
            </p>
          </div>
        )}

        {audioSource === 'upload' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase block">Tải tệp âm thanh (.mp3, .wav, .m4a)</label>
            
            {audioUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
                <div className="flex items-center gap-2 text-sm text-foreground overflow-hidden">
                  <Music className="h-4 w-4 text-violet-400 shrink-0" />
                  <span className="truncate font-mono text-xs">{audioUrl.split('/').pop()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAudioUrl('')}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Xóa & Tải lại
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center hover:border-violet-500/30 hover:bg-white/5 transition-all group">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
                    <span className="text-xs text-muted-foreground">Đang tải lên: {uploadProgress}%</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground group-hover:text-violet-400 transition-colors mb-2" />
                    <span className="text-xs font-semibold text-foreground">Chọn file âm thanh để tải lên</span>
                    <span className="text-[10px] text-muted-foreground mt-1">Giới hạn file tối đa 50MB</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {audioSource === 'external' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase block">Đường dẫn liên kết trực tiếp (Direct Link)</label>
            <input
              type="url"
              placeholder="VD: https://domain.com/audio/test-1.mp3"
              value={audioUrl}
              onChange={e => setAudioUrl(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        )}
      </div>

      {audioUrl && (
        <div className="p-3 bg-neutral-950 rounded-xl border border-white/10 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Trình nghe thử (Preview Audio)</span>
          {audioSource === 'youtube' ? (
            <div className="relative pt-[56.25%] rounded-lg overflow-hidden bg-black border border-white/10">
              <iframe
                src={`https://www.youtube.com/embed/${parseYoutubeId(audioUrl)}?controls=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
              />
            </div>
          ) : (
            <audio 
              src={audioUrl} 
              controls 
              className="w-full" 
              controlsList="nodownload" // Chặn nút tải xuống mặc định
            />
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading || !audioUrl}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <Save className="h-4 w-4" /> Lưu cấu hình
        </button>
      </div>
    </div>
  )
}
