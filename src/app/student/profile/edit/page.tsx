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
import { StudentHeader } from "@/components/student/StudentHeader"
import { ArrowLeft, Save, User } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"

export default function StudentProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [originalNickname, setOriginalNickname] = useState("")
  const isX = originalNickname === "X"
  const [formData, setFormData] = useState({ 
    full_name: "", 
    nickname: "", 
    class: "", 
    grade: "",
    class_suffix: "",
    bio: "", 
    phone: "", 
    avatar_url: "",
    discord_id: ""
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
          discord_id: profile.discord_id || ""
        })
        setOriginalNickname(profile.nickname || "")
      }
      setLoading(false)
    }
    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

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

  if (loading) return <Loading fullPage label="Đang tải hồ sơ..." />

  return (
    <StudentShell>
      <StudentHeader name={formData.full_name} studentClass={formData.class} onLogout={handleLogout} nickname={formData.nickname} />
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/student/profile">
            <Button variant="outline" size="icon" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent transition-transform hover:scale-110 active:scale-90">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <User className="h-3 w-3" /> Profile
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Chỉnh sửa hồ sơ</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-8 space-y-8 shadow-sm">
          <div className="flex flex-col items-center">
            <Label className="mb-6 block text-sm font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Ảnh đại diện</Label>
            <AvatarUpload currentUrl={formData.avatar_url} onUploadComplete={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))} onRemove={() => setFormData((prev) => ({ ...prev, avatar_url: "" }))} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-bold">Họ và tên <span className="text-red-500">*</span></Label>
              <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))} required className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-bold">Biệt danh</Label>
              <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="vd: hoc_sinh_gioi" maxLength={20} className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] px-1 italic">Dùng chữ cái, số và dấu gạch dưới</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-select" className="text-sm font-bold">Khối lớp {!isX && <span className="text-red-500">*</span>}</Label>
              <select
                id="grade-select"
                value={formData.grade}
                onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 px-4 py-3 text-sm focus:border-[hsl(var(--foreground))] focus:ring-1 focus:ring-[hsl(var(--foreground))] outline-none transition-all duration-200"
                required={!isX}
              >
                {isX ? (
                  <option value="">-- Không chọn (Mở khóa toàn bộ khối) --</option>
                ) : (
                  <option value="" disabled>-- Chọn khối --</option>
                )}
                {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                  <option key={g} value={g}>Khối {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_suffix" className="text-sm font-bold">Tên lớp {!isX && <span className="text-red-500">*</span>}</Label>
              <Input id="class_suffix" value={formData.class_suffix} onChange={(e) => setFormData((prev) => ({ ...prev, class_suffix: e.target.value }))} placeholder="vd: A1, B2" required={!isX} className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold">Số điện thoại</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="0123456789" className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord_id" className="text-sm font-bold">Discord ID</Label>
              <Input id="discord_id" value={formData.discord_id} onChange={(e) => setFormData((prev) => ({ ...prev, discord_id: e.target.value }))} placeholder="Ví dụ: 123456789012345678" className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-bold">Giới thiệu bản thân</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Viết vài dòng ngắn về bạn..." maxLength={200} rows={4} className="rounded-2xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))] resize-none" />
            <div className="flex justify-end"><span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">{formData.bio.length}/200</span></div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-600 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">Đã lưu thành công. Đang chuyển hướng...</div>}

          <div className="flex gap-4 pt-4">
            <Link href="/student/profile" className="flex-1">
              <Button type="button" variant="outline" className="w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent py-6 font-bold" disabled={saving}>Hủy</Button>
            </Link>
            <Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 py-6 font-bold shadow-lg shadow-black/5">
              {saving ? <><DotmSquare1 size={16} dotSize={2} className="mr-2" />Đang lưu</> : <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</>}
            </Button>
          </div>
        </form>
      </main>
    </StudentShell>
  )
}
