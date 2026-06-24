import React, { useState, useEffect } from "react"
import { X, BookOpen, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimetableSlot, PRESET_SUBJECTS, PRESET_TYPES, PRESET_TIMES } from "./constants"

interface EditSlotModalProps {
  slot: TimetableSlot
  onClose: () => void
  onSave: (updatedSlot: TimetableSlot) => void
}

export function EditSlotModal({ slot, onClose, onSave }: EditSlotModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0A13]/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#15131F] border border-[#C18CFF]/20 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8C87A2] hover:text-[#F1EDF9] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C18CFF]/10 border border-[#C18CFF]/20">
            <BookOpen className="h-5 w-5 text-[#C18CFF]" />
          </div>
          <div>
            <h3 className="text-2xl text-[#F1EDF9] font-normal italic font-instrument-serif">
              Tùy chỉnh ca học
            </h3>
            <p className="text-[10px] text-[#8C87A2] uppercase tracking-wider mt-0.5">Cấu hình thời khóa biểu</p>
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
            <label className="text-xs text-[#8C87A2] font-semibold">Môn học</label>
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
                className="w-full bg-[#0B0A13] border border-[#8C87A2]/10 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] focus:outline-none focus:border-[#C18CFF]/50 transition-colors"
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
                  className="w-full bg-[#0B0A13] border border-[#C18CFF]/30 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] placeholder-[#8C87A2]/50 focus:outline-none focus:border-[#C18CFF] transition-colors"
                />
              )}
            </div>
          </div>

          {/* Hình thức */}
          <div className="space-y-2">
            <label className="text-xs text-[#8C87A2] font-semibold">Hình thức học</label>
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
                className="w-full bg-[#0B0A13] border border-[#8C87A2]/10 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] focus:outline-none focus:border-[#C18CFF]/50 transition-colors"
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
                  className="w-full bg-[#0B0A13] border border-[#C18CFF]/30 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] placeholder-[#8C87A2]/50 focus:outline-none focus:border-[#C18CFF] transition-colors"
                />
              )}
            </div>
          </div>

          {/* Thời gian */}
          <div className="space-y-2">
            <label className="text-xs text-[#8C87A2] font-semibold">Khung giờ</label>
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
                className="w-full bg-[#0B0A13] border border-[#8C87A2]/10 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] focus:outline-none focus:border-[#C18CFF]/50 transition-colors"
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
                  className="w-full bg-[#0B0A13] border border-[#C18CFF]/30 rounded-xl px-4 py-3 text-sm text-[#F1EDF9] placeholder-[#8C87A2]/50 focus:outline-none focus:border-[#C18CFF] transition-colors"
                />
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3 mt-8">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 py-5 rounded-xl border-[#8C87A2]/20 hover:border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent font-medium"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 py-5 rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold tracking-wide"
          >
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  )
}
