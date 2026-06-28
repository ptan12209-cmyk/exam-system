"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, AlertCircle } from "lucide-react"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"

interface GradeOnboardingModalProps {
  userId: string
  onComplete: (grade: number, classSuffix: string) => void
}

export function GradeOnboardingModal({ userId, onComplete }: GradeOnboardingModalProps) {
  const supabase = createClient()
  const [grade, setGrade] = useState<string>("")
  const [classSuffix, setClassSuffix] = useState<string>("")
  const [isFreeCandidate, setIsFreeCandidate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let gradeVal = grade
    let suffixVal = classSuffix

    if (isFreeCandidate) {
      gradeVal = "12"
      suffixVal = "Tự do"
    }

    if (!gradeVal) {
      setError("Vui lòng chọn khối lớp của bạn.")
      return
    }
    const gradeNum = parseInt(gradeVal)
    if (isNaN(gradeNum) || gradeNum < 6 || gradeNum > 12) {
      setError("Khối lớp không hợp lệ.")
      return
    }
    if (!suffixVal.trim()) {
      setError("Vui lòng nhập tên lớp của bạn (Ví dụ: A1, B2).")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const fullClassName = isFreeCandidate ? "Tự do" : `${gradeNum}${suffixVal.trim().toUpperCase()}`
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          grade: gradeNum,
          class_suffix: suffixVal.trim().toUpperCase(),
          class: fullClassName // Keep for backward compatibility
        })
        .eq("id", userId)

      if (updateError) throw updateError

      onComplete(gradeNum, suffixVal.trim().toUpperCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu thông tin.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/90 p-8 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 ease-out">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] shadow-sm">
          <GraduationCap className="h-8 w-8 text-[hsl(var(--foreground))]" strokeWidth={1.2} />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Chào mừng bạn đến với ExamHub!</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Để hiển thị bài tập, đề thi và bài giảng chính xác nhất, vui lòng hoàn thiện thông tin lớp học của bạn.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 text-left space-y-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 hover:bg-[hsl(var(--background))]/50 transition-all duration-200 select-none cursor-pointer">
            <input
              type="checkbox"
              id="free-candidate-checkbox"
              checked={isFreeCandidate}
              onChange={(e) => {
                setIsFreeCandidate(e.target.checked)
                if (e.target.checked) {
                  setGrade("12")
                  setClassSuffix("Tự do")
                } else {
                  setGrade("")
                  setClassSuffix("")
                }
              }}
              className="h-4 w-4 rounded border-[hsl(var(--border))]/60 text-[hsl(var(--primary))] focus:ring-0 focus:ring-offset-0 bg-[hsl(var(--background))]/50 cursor-pointer"
            />
            <label htmlFor="free-candidate-checkbox" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer flex-1 text-left">
              Tôi là thí sinh tự do
            </label>
          </div>

          {!isFreeCandidate ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="grade-select" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Khối lớp <span className="text-red-500">*</span></Label>
                <select
                  id="grade-select"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 px-4 py-3 text-sm focus:border-[hsl(var(--foreground))] focus:ring-1 focus:ring-[hsl(var(--foreground))] outline-none transition-all duration-200"
                  required
                >
                  <option value="" disabled>-- Chọn khối lớp (6 đến 12) --</option>
                  {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                    <option key={g} value={g}>Khối {g}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-suffix-input" className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tên lớp <span className="text-red-500">*</span></Label>
                <Input
                  id="class-suffix-input"
                  value={classSuffix}
                  onChange={(e) => setClassSuffix(e.target.value)}
                  placeholder="VD: A1, B2, Chuyên Lý..."
                  className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]"
                  required
                  maxLength={15}
                />
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic px-1">Tên lớp sẽ được kết hợp tạo thành: {grade ? `${grade}${classSuffix.toUpperCase()}` : "Lớp của bạn"}</p>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 text-left">
              <p className="text-[10px] text-[hsl(var(--primary))] font-bold uppercase tracking-wider">Thông tin thí sinh tự do</p>
              <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Hệ thống sẽ thiết lập khối lớp là <strong>Khối 12</strong> để cung cấp đầy đủ đề ôn thi tốt nghiệp THPT Quốc gia cho bạn.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 py-6 font-bold mt-4 shadow-lg shadow-black/5 active:scale-95 transition-transform"
          >
            {saving ? (
              <>
                <DotmSquare1 size={16} dotSize={2} className="mr-2" />
                Đang lưu...
              </>
            ) : (
              "Hoàn tất thiết lập"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
