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

export default function StudentProfileEditPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState({
        full_name: "",
        nickname: "",
        class: "",
        bio: "",
        phone: "",
        avatar_url: ""
    })

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            if (profile) {
                setFormData({
                    full_name: profile.full_name || "",
                    nickname: profile.nickname || "",
                    class: profile.class || "",
                    bio: profile.bio || "",
                    phone: profile.phone || "",
                    avatar_url: profile.avatar_url || ""
                })
            }

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

            // Validate
            if (!formData.full_name.trim()) {
                throw new Error("Họ và tên không được để trống")
            }

            if (formData.nickname && (formData.nickname.length < 3 || formData.nickname.length > 20)) {
                throw new Error("Biệt danh phải từ 3-20 ký tự")
            }

            if (formData.nickname && !/^[a-zA-Z0-9_]+$/.test(formData.nickname)) {
                throw new Error("Biệt danh chỉ được chứa chữ cái, số và dấu gạch dưới")
            }

            if (formData.bio && formData.bio.length > 200) {
                throw new Error("Giới thiệu tối đa 200 ký tự")
            }

            // Update profile
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    nickname: formData.nickname || null,
                    class: formData.class || null,
                    bio: formData.bio || null,
                    phone: formData.phone || null
                })
                .eq("id", user.id)

            if (updateError) {
                // Check for unique constraint violation
                if (updateError.code === "23505") {
                    throw new Error("Biệt danh đã được sử dụng")
                }
                throw updateError
            }

            setSuccess(true)
            setTimeout(() => {
                router.push("/student/profile")
            }, 1500)

        } catch (err) {
            setError(err instanceof Error ? err.message : "Có lỗi xảy ra")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/student/profile">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Chỉnh sửa hồ sơ
                    </h1>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6">
                    {/* Avatar */}
                    <div>
                        <Label className="text-center block mb-4 text-gray-700 dark:text-gray-300">Ảnh đại diện</Label>
                        <AvatarUpload
                            currentUrl={formData.avatar_url}
                            onUploadComplete={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                            onRemove={() => setFormData(prev => ({ ...prev, avatar_url: "" }))}
                        />
                    </div>

                    <hr className="border-gray-200 dark:border-slate-800" />

                    {/* Full Name */}
                    <div>
                        <Label htmlFor="full_name" className="text-gray-700 dark:text-gray-300">
                            Họ và tên <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            required
                            className="mt-2"
                        />
                    </div>

                    {/* Nickname */}
                    <div>
                        <Label htmlFor="nickname" className="text-gray-700 dark:text-gray-300">Biệt danh</Label>
                        <Input
                            id="nickname"
                            value={formData.nickname}
                            onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                            placeholder="vd: hoc_sinh_gioi"
                            maxLength={20}
                            className="mt-2"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            3-20 ký tự, chỉ chữ cái, số và dấu gạch dưới
                        </p>
                    </div>

                    {/* Class */}
                    <div>
                        <Label htmlFor="class" className="text-gray-700 dark:text-gray-300">Lớp</Label>
                        <Input
                            id="class"
                            value={formData.class}
                            onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                            placeholder="vd: 12A1"
                            className="mt-2"
                        />
                    </div>

                    {/* Bio */}
                    <div>
                        <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Giới thiệu bản thân</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Viết vài dòng về bản thân..."
                            maxLength={200}
                            rows={4}
                            className="mt-2"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                            {formData.bio.length}/200
                        </p>
                    </div>

                    {/* Phone */}
                    <div>
                        <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Số điện thoại</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="0123456789"
                            className="mt-2"
                        />
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 text-green-600 dark:text-green-400 text-sm">
                            Đã lưu thành công! Đang chuyển hướng...
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Link href="/student/profile" className="flex-1">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={saving}
                            >
                                Hủy
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Lưu thay đổi
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
