import React, { useState, useEffect } from "react"
import { X, BookOpen, AlertCircle, Trash2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimetableSlot, PRESET_SUBJECTS, PRESET_TYPES, PRESET_TIMES } from "./constants"

interface EditSlotModalProps {
  slot: TimetableSlot
  onClose: () => void
  onSave: (updatedSlot: TimetableSlot) => void
  onDelete: (slot: TimetableSlot) => void
  onReset: (slot: TimetableSlot) => void
  isCustomized: boolean
}

export function EditSlotModal({ slot, onClose, onSave, onDelete, onReset, isCustomized }: EditSlotModalProps) {
  const [subject, setSubject] = useState(slot.subject)
  const [customSubject, setCustomSubject] = useState("")
  const [isCustomSubject, setIsCustomSubject] = useState(!PRESET_SUBJECTS.includes(slot.subject))

  const [type, setType] = useState(slot.type)
  const [customType, setCustomType] = useState("")
  const [isCustomType, setIsCustomType] = useState(!PRESET_TYPES.includes(slot.type))

  const [time, setTime] = useState(slot.time)
  const [customTime, setCustomTime] = useState("")
  const [isCustomTime, setIsCustomTime] = useState(!PRESET_TIMES.includes(slot.time))

  const [error, setError] = useState("")

  useEffect(() => {
    if (isCustomSubject) setCustomSubject(slot.subject)
    if (isCustomType) setCustomType(slot.type)
    if (isCustomTime) setCustomTime(slot.time)
  }, [slot, isCustomSubject, isCustomType, isCustomTime])

  const handleSave = () => {
    const finalSubject = isCustomSubject ? customSubject.trim() : subject
    const finalType = isCustomType ? customType.trim() : type
    const finalTime = isCustomTime ? customTime.trim() : time

    if (!finalSubject) {
      setError("Vui lòng chọn hoặc nhập tên môn học.")
      return
    }
    if (!finalType) {
      setError("Vui lòng chọn hoặc nhập hình thức học.")
      return
    }
    if (!finalTime) {
      setError("Vui lòng chọn hoặc nhập khung giờ.")
      return
    }

    // Xác định màu dựa trên tên môn học
    let color = "other"
    const subLower = finalSubject.toLowerCase()
    if (subLower.includes("toán")) color = "toan"
    else if (subLower.includes("lý") || subLower.includes("vật lý")) color = "ly"
    else if (subLower.includes("hóa")) color = "hoa"
    else if (subLower.includes("sinh")) color = "sinh"
    else if (subLower.includes("văn") || subLower.includes("ngữ văn")) color = "van"
    else if (subLower.includes("anh")) color = "anh"
    else if (subLower.includes("v-act") || subLower.includes("vact")) color = "vact"

    onSave({
      ...slot,
      subject: finalSubject,
      type: finalType,
      time: finalTime,
      color
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--background))]/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/20 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
            <BookOpen className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 className="text-2xl text-[hsl(var(--foreground))] font-normal italic font-instrument-serif">
              Tùy chỉnh ca học
            </h3>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mt-0.5">Cấu hình thời khóa biểu</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Môn Học */}
          <div className="space-y-2">
            <label className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Môn học</label>
            <div className="flex flex-col gap-2">
              <select
                value={isCustomSubject ? "Khác" : subject}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "Khác") {
                    setIsCustomSubject(true)
                  } else {
                    setIsCustomSubject(false)
                    setSubject(val)
                  }
                }}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))]/25 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]/50 transition-colors"
              >
                {PRESET_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
                <option value="Khác">-- Tùy chọn khác --</option>
              </select>

              {isCustomSubject && (
                <input
                  type="text"
                  placeholder="Nhập tên môn học tự chọn..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--primary))]/30 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/50 focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                />
              )}
            </div>
          </div>

          {/* Hình thức */}
          <div className="space-y-2">
            <label className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Hình thức học</label>
            <div className="flex flex-col gap-2">
              <select
                value={isCustomType ? "Khác" : type}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "Khác") {
                    setIsCustomType(true)
                  } else {
                    setIsCustomType(false)
                    setType(val)
                  }
                }}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))]/25 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]/50 transition-colors"
              >
                {PRESET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Khác">-- Tùy chọn khác --</option>
              </select>

              {isCustomType && (
                <input
                  type="text"
                  placeholder="Nhập hình thức học..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--primary))]/30 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/50 focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                />
              )}
            </div>
          </div>

          {/* Thời gian */}
          <div className="space-y-2">
            <label className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Khung giờ</label>
            <div className="flex flex-col gap-2">
              <select
                value={isCustomTime ? "Khác" : time}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "Khác") {
                    setIsCustomTime(true)
                  } else {
                    setIsCustomTime(false)
                    setTime(val)
                  }
                }}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))]/25 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))]/50 transition-colors"
              >
                {PRESET_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Khác">-- Tự định nghĩa --</option>
              </select>

              {isCustomTime && (
                <input
                  type="text"
                  placeholder="Ví dụ: 09:00 - 11:30..."
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--primary))]/30 rounded-xl px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]/50 focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col gap-3 mt-8">
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 py-5 rounded-xl border-[hsl(var(--border))]/40 hover:border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-transparent font-medium"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 py-5 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] font-semibold tracking-wide"
            >
              Lưu thay đổi
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => onDelete(slot)}
              variant="outline"
              className="flex-1 py-3.5 rounded-xl border-red-500/20 hover:border-red-500/40 text-red-400 bg-transparent font-medium text-xs flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa ca học (Nghỉ)</span>
            </Button>
            {isCustomized && (
              <Button
                onClick={() => onReset(slot)}
                variant="outline"
                className="flex-1 py-3.5 rounded-xl border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400 bg-transparent font-medium text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục mặc định</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
