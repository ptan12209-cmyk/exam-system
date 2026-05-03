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
import { ArrowLeft, Save } from "lucide-react"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { Loading } from "@/components/shared/Loading"

export default function TeacherProfileEditPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({ full_name: "", nickname: "", bio: "", phone: "", avatar_url: "" })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (profile) setFormData({ full_name: profile.full_name || "", nickname: profile.nickname || "", bio: profile.bio || "", phone: profile.phone || "", avatar_url: profile.avatar_url || "" })
      setLoading(false)
    }
    loadProfile()
  }, [router, supabase])

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
        bio: formData.bio || null,
        phone: formData.phone || null,
        avatar_url: formData.avatar_url || null,
      }).eq("id", user.id)

      if (updateError) {
        if (updateError.code === "23505") throw new Error("Biệt danh đã được sử dụng")
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => router.push("/teacher/profile"), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang tải cấu hình..." />

  return (
    <TeacherShell onLogout={handleLogout}>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pb-24 pt-20 lg:pt-10">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/teacher/profile"><Button variant="outline" size="icon" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Teacher profile</p><h1 className="text-2xl font-semibold">Chỉnh sửa hồ sơ</h1></div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-6">
          <div>
            <Label className="mb-4 block text-center">Ảnh đại diện</Label>
            <AvatarUpload currentUrl={formData.avatar_url} onUploadComplete={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))} onRemove={() => setFormData((prev) => ({ ...prev, avatar_url: "" }))} />
          </div>

          <div className="border-t border-[hsl(var(--border))]/50 pt-6 space-y-5">
            <div>
              <Label htmlFor="full_name">Họ và tên <span className="text-red-500">*</span></Label>
              <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))} required className="mt-2 rounded-xl" />
            </div>

            <div>
              <Label htmlFor="nickname">Biệt danh</Label>
              <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))} placeholder="vd: thay_giao_toan" maxLength={20} className="mt-2 rounded-xl" />
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới</p>
            </div>

            <div>
              <Label htmlFor="bio">Giới thiệu bản thân</Label>
              <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))} placeholder="Viết vài dòng về bản thân và kinh nghiệm giảng dạy..." maxLength={200} rows={4} className="mt-2 rounded-xl" />
              <p className="mt-1 text-right text-xs text-[hsl(var(--muted-foreground))]">{formData.bio.length}/200</p>
            </div>

            <div>
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} placeholder="0123456789" className="mt-2 rounded-xl" />
            </div>
          </div>

          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">Đã lưu thành công. Đang chuyển hướng...</div>}

          <div className="flex gap-3 pt-2">
            <Link href="/teacher/profile" className="flex-1">
              <Button type="button" variant="outline" className="w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent" disabled={saving}>Hủy</Button>
            </Link>
            <Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu</> : <><Save className="mr-2 h-4 w-4" />Lưu thay đổi</>}
            </Button>
          </div>
        </form>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
