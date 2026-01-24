"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Role = "student" | "teacher"

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [phone, setPhone] = useState("")
    const [className, setClassName] = useState("")
    const [role, setRole] = useState<Role>("student")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (role === "teacher") {
            const { data: whitelistCheck } = await supabase
                .from("teacher_whitelist")
                .select("id")
                .eq("email", email.toLowerCase().trim())
                .single()

            if (!whitelistCheck) {
                setError("Email này chưa được cấp quyền Giáo viên. Vui lòng liên hệ quản trị viên.")
                setLoading(false)
                return
            }
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        if (!authData.user) {
            setError("Có lỗi xảy ra khi tạo tài khoản")
            setLoading(false)
            return
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
                id: authData.user.id,
                role: role,
                full_name: fullName,
                class: role === "student" ? className : null,
            }, { onConflict: 'id' })

        if (profileError) {
            setError(profileError.message)
            setLoading(false)
            return
        }

        if (role === "teacher") {
            router.push("/teacher/dashboard")
        } else {
            router.push("/student/dashboard")
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg">
                            <span className="text-2xl">🎓</span>
                        </div>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link href="/" className="text-gray-500 hover:text-blue-600">🏠</Link>
                        <Link href="/resources" className="text-gray-500 hover:text-blue-600">📚</Link>
                        <Link href="/arena" className="text-gray-500 hover:text-blue-600">🏆</Link>
                    </nav>
                    <div className="flex items-center space-x-4">
                        <Link href="/login" className="text-gray-500 hover:text-blue-600 font-medium text-sm">Đăng nhập</Link>
                        <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium text-sm shadow-sm">Đăng ký</Link>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center py-12 px-4 bg-gray-50">
                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left - Illustration */}
                    <div className="hidden lg:block space-y-8 pr-8 border-r border-gray-200">
                        <div>
                            <h1 className="text-4xl font-bold text-blue-600 mb-4">
                                Tạo tài khoản
                            </h1>
                            <p className="text-lg text-gray-500 leading-relaxed">
                                Học tập và giao lưu với hàng triệu học viên trên mọi miền đất nước. Cùng chinh phục kỳ thi THPT Quốc gia 2026.
                            </p>
                        </div>
                        <div className="relative w-full flex items-center justify-center py-8">
                            <span className="text-[150px]">📖</span>
                        </div>
                    </div>

                    {/* Right - Form */}
                    <div className="w-full max-w-md mx-auto lg:max-w-none">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
                                Đăng ký
                            </h2>
                            <p className="mt-2 text-xs text-gray-500">
                                Bằng việc đăng ký, bạn đồng ý với{" "}
                                <a href="#" className="text-blue-600 hover:underline">Chính sách bảo mật</a> và{" "}
                                <a href="#" className="text-blue-600 hover:underline">Điều khoản dịch vụ</a>.
                            </p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Role Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole("student")}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                                        role === "student"
                                            ? "border-blue-500 bg-blue-50 text-blue-600"
                                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                                    )}
                                >
                                    <span className="text-2xl">👤</span>
                                    <span className="font-medium">Học sinh</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("teacher")}
                                    className={cn(
                                        "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                                        role === "teacher"
                                            ? "border-purple-500 bg-purple-50 text-purple-600"
                                            : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                                    )}
                                >
                                    <span className="text-2xl">👨‍🏫</span>
                                    <span className="font-medium">Giáo viên</span>
                                </button>
                            </div>

                            <div>
                                <label htmlFor="fullname" className="block text-sm font-medium text-gray-600 mb-1">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="fullname"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nhập họ và tên của bạn"
                                    required
                                    className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder-gray-400"
                                />
                            </div>

                            {role === "student" && (
                                <div>
                                    <label htmlFor="className" className="block text-sm font-medium text-gray-600 mb-1">
                                        Lớp
                                    </label>
                                    <input
                                        id="className"
                                        type="text"
                                        value={className}
                                        onChange={(e) => setClassName(e.target.value)}
                                        placeholder="12A1"
                                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder-gray-400"
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    required
                                    className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder-gray-400"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-600 mb-1">
                                    Số điện thoại
                                </label>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="09xx xxx xxx"
                                    className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder-gray-400"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={cn(
                                        "w-full font-semibold py-3 px-4 rounded-lg shadow-md transition duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed",
                                        role === "student"
                                            ? "bg-blue-600 hover:bg-blue-700"
                                            : "bg-purple-600 hover:bg-purple-700"
                                    )}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Đang đăng ký...
                                        </span>
                                    ) : (
                                        "Tạo tài khoản"
                                    )}
                                </button>
                            </div>

                            <div className="text-center pt-2">
                                <p className="text-sm text-gray-500">
                                    Đã có tài khoản?{" "}
                                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                        Đăng nhập
                                    </Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
                    <h3 className="text-xl font-bold mb-2">Thông tin liên hệ</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-blue-100">
                        <span className="flex items-center gap-2">
                            <span>👤</span> ExamHub Team
                        </span>
                        <span className="hidden sm:inline opacity-50">|</span>
                        <span className="flex items-center gap-2">
                            <span>📧</span> contact@examhub.id.vn
                        </span>
                    </div>
                    <p className="mt-6 text-xs text-blue-200 opacity-60">
                        © 2026 ExamHub. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
