"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/AvatarUpload"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { ArrowLeft, Save, User } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { getUserStats } from "@/lib/gamification"
import { cn } from "@/lib/utils"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function StudentProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [originalNickname, setOriginalNickname] = useState("")
  const isX = originalNickname === "X"
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })
  const [formData, setFormData] = useState({ 
    full_name: "", 
    nickname: "", 
    class: "", 
    grade: "",
    class_suffix: "",
    bio: "", 
    phone: "", 
    avatar_url: "",
    discord_id: "",
    discord_study_channel_id: ""
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (profile) {
        setFormData({ 
          full_name: profile.full_name || "", 
          nickname: profile.nickname || "", 
          class: profile.class || "", 
          grade: profile.grade ? String(profile.grade) : "",
          class_suffix: profile.class_suffix || "",
          bio: profile.bio || "", 
          phone: profile.phone || "", 
          avatar_url: profile.avatar_url || "",
          discord_id: profile.discord_id || "",
          discord_study_channel_id: profile.discord_study_channel_id || ""
        })
        setOriginalNickname(profile.nickname || "")
      }

      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      setLoading(false)
    }
    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      if (!formData.full_name.trim()) throw new Error("Họ và tên không được để trống")
      if (formData.nickname && formData.nickname !== "X" && (formData.nickname.length < 3 || formData.nickname.length > 20)) {
        throw new Error("Biệt danh phải từ 3-20 ký tự")
      }
      if (formData.nickname && formData.nickname.toUpperCase() === "X" && originalNickname !== "X") {
        throw new Error("Biệt danh này đã được bảo lưu và không thể sử dụng")
      }
      if (formData.nickname && !/^[a-zA-Z0-9_]+$/.test(formData.nickname)) throw new Error("Biệt danh chỉ được chứa chữ cái, số và dấu gạch dưới")
      
      const gradeNum = formData.grade ? parseInt(formData.grade) : null
      if (!isX) {
        if (gradeNum === null || isNaN(gradeNum) || gradeNum < 6 || gradeNum > 12) throw new Error("Vui lòng chọn khối lớp hợp lệ (6 - 12)")
        if (!formData.class_suffix.trim()) throw new Error("Vui lòng nhập tên lớp của bạn")
      } else {
        if (formData.grade && (isNaN(gradeNum!) || gradeNum! < 6 || gradeNum! > 12)) throw new Error("Vui lòng chọn khối lớp hợp lệ (6 - 12)")
      }
      
      if (formData.bio && formData.bio.length > 200) throw new Error("Giới thiệu tối đa 200 ký tự")
      if (formData.discord_id.trim() && !/^\d{17,20}$/.test(formData.discord_id.trim())) {
        throw new Error("Discord ID không hợp lệ. Vui lòng nhập dãy từ 17-20 chữ số.")
      }
      if (formData.discord_study_channel_id.trim() && !/^\d{17,20}$/.test(formData.discord_study_channel_id.trim())) {
        throw new Error("ID Kênh Voice Discord học tập riêng không hợp lệ. Vui lòng nhập dãy từ 17-20 chữ số.")
      }

      const fullClassName = (gradeNum && formData.class_suffix.trim()) 
        ? `${gradeNum}${formData.class_suffix.trim().toUpperCase()}` 
        : (isX ? null : `${gradeNum}${formData.class_suffix.trim().toUpperCase()}`)

      const { error: updateError } = await supabase.from("profiles").update({
        full_name: formData.full_name,
        nickname: formData.nickname || null,
        class: fullClassName,
        grade: gradeNum,
        class_suffix: formData.class_suffix.trim() ? formData.class_suffix.trim().toUpperCase() : null,
        bio: formData.bio || null,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url || null,
        discord_id: formData.discord_id.trim() || null,
        discord_study_channel_id: formData.discord_study_channel_id.trim() || null,
      }).eq("id", user.id)

      if (updateError) {
        if (updateError.code === "23505") throw new Error("Biệt danh đã được sử dụng")
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => router.push("/student/profile"), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải hồ sơ..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={formData.full_name}
        userXp={studentStats.xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Back Link Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/student/profile">
            <Button variant="outline" size="icon" className="rounded-xl border-[#8C87A2]/30 bg-[#15131F] text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF] transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8C87A2]">
              <User className="h-3 w-3 text-[#C18CFF]" /> Profile Settings
            </div>
            <h1 className={cn("text-3xl text-[#F1EDF9] font-bold tracking-tight", instrumentSerif.className)}>Chỉnh sửa hồ sơ</h1>
          </div>
        </div>

        {/* Settings Form Container */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-8 space-y-8 shadow-sm">
          
          {/* Avatar Area */}
          <div className="flex flex-col items-center border-b border-[#8C87A2]/10 pb-6">
            <Label className="mb-4 block text-xs font-bold uppercase tracking-widest text-[#8C87A2] font-mono">Ảnh đại diện</Label>
            <AvatarUpload 
              currentUrl={formData.avatar_url} 
              onUploadComplete={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))} 
              onRemove={() => setFormData((prev) => ({ ...prev, avatar_url: "" }))} 
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Họ và tên <span className="text-red-500">*</span></Label>
              <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))} required className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Biệt danh</Label>
              <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="vd: hoc_sinh_gioi" maxLength={20} className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
              <p className="text-[9px] text-[#8C87A2] font-mono px-1 italic">Dùng chữ cái, số và dấu gạch dưới</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-select" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Khối lớp {!isX && <span className="text-red-500">*</span>}</Label>
              <select
                id="grade-select"
                value={formData.grade}
                onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                className="w-full rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-4 py-3 text-sm text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-1 focus:ring-[#C18CFF] outline-none transition-all cursor-pointer font-medium"
                required={!isX}
              >
                {isX ? (
                  <option value="" className="bg-[#15131F]">-- Không chọn (Mở khóa toàn bộ khối) --</option>
                ) : (
                  <option value="" disabled className="bg-[#15131F]">-- Chọn khối --</option>
                )}
                {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                  <option key={g} value={g} className="bg-[#15131F]">Khối {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_suffix" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Tên lớp {!isX && <span className="text-red-500">*</span>}</Label>
              <Input id="class_suffix" value={formData.class_suffix} onChange={(e) => setFormData((prev) => ({ ...prev, class_suffix: e.target.value }))} placeholder="vd: A1, B2" required={!isX} className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Số điện thoại</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="0123456789" className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord_id" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Discord ID</Label>
              <Input id="discord_id" value={formData.discord_id} onChange={(e) => setFormData((prev) => ({ ...prev, discord_id: e.target.value }))} placeholder="Ví dụ: 123456789012345678" className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord_study_channel_id" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">ID Kênh Voice Discord riêng</Label>
              <Input id="discord_study_channel_id" value={formData.discord_study_channel_id} onChange={(e) => setFormData((prev) => ({ ...prev, discord_study_channel_id: e.target.value }))} placeholder="Ví dụ: 987654321098765432" className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Giới thiệu bản thân</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Viết vài dòng ngắn giới thiệu về bản thân bạn..." maxLength={200} rows={4} className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF] focus:ring-[#C18CFF] resize-none" />
            <div className="flex justify-end"><span className="text-[9px] font-bold text-[#8C87A2] uppercase tracking-widest font-mono">{formData.bio.length}/200</span></div>
          </div>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 animate-in fade-in slide-in-from-top-2">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-400 animate-in fade-in slide-in-from-top-2">Đã lưu hồ sơ thành công. Đang quay lại...</div>}

          <div className="flex gap-4 pt-4 border-t border-[#8C87A2]/10">
            <Link href="/student/profile" className="flex-1">
              <Button type="button" variant="outline" className="w-full rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent py-6 font-bold" disabled={saving}>Hủy</Button>
            </Link>
            <Button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] py-6 font-bold shadow-md">
              {saving ? <><DotmSquare1 size={16} dotSize={2} className="mr-2" />Đang lưu</> : <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</>}
            </Button>
          </div>
        </form>
      </main>
    </StudentShell>
  )
}
