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
  const [formData, setFormData] = useState({ full_name: "", nickname: "", class: "", bio: "", phone: "", avatar_url: "" })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (profile) setFormData({ full_name: profile.full_name || "", nickname: profile.nickname || "", class: profile.class || "", bio: profile.bio || "", phone: profile.phone || "", avatar_url: profile.avatar_url || "" })
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
      if (formData.nickname && (formData.nickname.length < 3 || formData.nickname.length > 20)) throw new Error("Biệt danh phải từ 3-20 ký tự")
      if (formData.nickname && !/^[a-zA-Z0-9_]+$/.test(formData.nickname)) throw new Error("Biệt danh chỉ được chứa chữ cái, số và dấu gạch dưới")
      if (formData.bio && formData.bio.length > 200) throw new Error("Giới thiệu tối đa 200 ký tự")

      const { error: updateError } = await supabase.from("profiles").update({
        full_name: formData.full_name,
        nickname: formData.nickname || null,
        class: formData.class || null,
        bio: formData.bio || null,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url || null,
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
      <StudentHeader name={formData.full_name} studentClass={formData.class} onLogout={handleLogout} />
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
              <Label htmlFor="class" className="text-sm font-bold">Lớp</Label>
              <Input id="class" value={formData.class} onChange={(e) => setFormData((prev) => ({ ...prev, class: e.target.value }))} placeholder="vd: 12A1" className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold">Số điện thoại</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="0123456789" className="rounded-xl border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/50 focus:bg-[hsl(var(--background))]" />
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
