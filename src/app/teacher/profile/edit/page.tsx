"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarUpload } from "@/components/AvatarUpload"
import { ArrowLeft, Loader2, Save } from "lucide-react"

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
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
            if (profile) setFormData({ full_name: profile.full_name || "", nickname: profile.nickname || "", bio: profile.bio || "", phone: profile.phone || "", avatar_url: profile.avatar_url || "" })
            setLoading(false)
        }
        loadProfile()
    }, [router, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setSuccess(false); setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            if (!formData.full_name.trim()) throw new Error("Họ và tên không được để trống")
            if (formData.nickname && (formData.nickname.length < 3 || formData.nickname.length > 20)) throw new Error("Biệt danh phải từ 3-20 ký tự")
            if (formData.nickname && !/^[a-zA-Z0-9_]+$/.test(formData.nickname)) throw new Error("Biệt danh chỉ được chứa chữ cái, số và dấu gạch dưới")
            if (formData.bio && formData.bio.length > 200) throw new Error("Giới thiệu tối đa 200 ký tự")
            const { error: updateError } = await supabase.from("profiles").update({ full_name: formData.full_name, nickname: formData.nickname || null, bio: formData.bio || null, phone: formData.phone || null }).eq("id", user.id)
            if (updateError) { if (updateError.code === "23505") throw new Error("Biệt danh đã được sử dụng"); throw updateError }
            setSuccess(true); setTimeout(() => router.push("/teacher/profile"), 1500)
        } catch (err) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra") }
        finally { setSaving(false) }
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/teacher/profile"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Button></Link>
                    <h1 className="text-2xl font-bold text-foreground">Chỉnh sửa hồ sơ</h1>
                </div>
                <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-6">
                    <div><Label className="text-center block mb-4 text-foreground">Ảnh đại diện</Label>
                        <AvatarUpload currentUrl={formData.avatar_url} onUploadComplete={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))} onRemove={() => setFormData(prev => ({ ...prev, avatar_url: "" }))} />
                    </div>
                    <hr className="border-border/50" />
                    <div><Label htmlFor="full_name" className="text-foreground">Họ và tên <span className="text-red-500">*</span></Label>
                        <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} required className="mt-2 bg-card border-border text-foreground" />
                    </div>
                    <div><Label htmlFor="nickname" className="text-foreground">Biệt danh</Label>
                        <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))} placeholder="vd: thay_giao_toan" maxLength={20} className="mt-2 bg-card border-border text-foreground" />
                        <p className="text-xs text-muted-foreground mt-1">3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới</p>
                    </div>
                    <div><Label htmlFor="bio" className="text-foreground">Giới thiệu bản thân</Label>
                        <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))} placeholder="Viết vài dòng về bản thân và kinh nghiệm giảng dạy..." maxLength={200} rows={4} className="mt-2 bg-card border-border text-foreground" />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{formData.bio.length}/200</p>
                    </div>
                    <div><Label htmlFor="phone" className="text-foreground">Số điện thoại</Label>
                        <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="0123456789" className="mt-2 bg-card border-border text-foreground" />
                    </div>
                    {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>}
                    {success && <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-600 dark:text-emerald-400 text-sm">Đã lưu thành công! Đang chuyển hướng...</div>}
                    <div className="flex gap-3 pt-4">
                        <Link href="/teacher/profile" className="flex-1"><Button type="button" variant="outline" className="w-full border-border text-muted-foreground" disabled={saving}>Hủy</Button></Link>
                        <Button type="submit" disabled={saving} className="flex-1 gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">
                            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="w-4 h-4 mr-2" />Lưu thay đổi</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
