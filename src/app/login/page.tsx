"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single()

        if (profile?.role === "teacher") {
            router.push("/teacher/dashboard")
        } else {
            router.push("/student/dashboard")
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
            {/* Header */}
            <header className="bg-white dark:bg-slate-950 shadow-sm border-b border-gray-100 dark:border-slate-800 py-4">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <span className="text-xl">🎓</span>
                        </div>
                        <span className="text-xl font-bold text-blue-600">LuyenDe</span>
                    </Link>
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link href="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">🏠</Link>
                        <Link href="/resources" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">📚</Link>
                        <Link href="/arena" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">🏆</Link>
                        <div className="flex items-center space-x-4 pl-4 border-l border-gray-200 dark:border-slate-700">
                            <ThemeToggle />
                            <Link href="/register" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Đăng ký</Link>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 shadow-sm">
                                Đăng nhập
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center py-12 px-4 bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-950">
                <div className="max-w-6xl w-full">
                    <div className="flex flex-col md:flex-row items-stretch bg-white dark:bg-slate-800/50 rounded-2xl shadow-xl overflow-hidden min-h-[550px] border border-gray-100 dark:border-slate-700">
                        {/* Left - Illustration */}
                        <div className="w-full md:w-1/2 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900 p-8 md:p-12 flex flex-col justify-center relative">
                            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-50 pointer-events-none">
                                <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
                                <div className="absolute top-0 -right-4 w-40 h-40 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
                                <div className="absolute -bottom-8 left-20 w-40 h-40 bg-indigo-200 dark:bg-indigo-900/30 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6 leading-tight">
                                    Chào mừng trở lại!
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                                    Cùng tiếp tục hành trình chinh phục kiến thức với LuyenDe.
                                </p>
                                <div className="relative w-full max-w-md mx-auto text-center">
                                    <span className="text-9xl">📚</span>
                                    <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-700 p-3 rounded-full shadow-lg animate-bounce">
                                        <span className="text-2xl">✅</span>
                                    </div>
                                    <div className="absolute bottom-8 -left-4 bg-white dark:bg-slate-700 p-3 rounded-full shadow-lg animate-pulse">
                                        <span className="text-2xl">💡</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right - Form */}
                        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white dark:bg-slate-900 flex flex-col justify-center">
                            <div className="max-w-md mx-auto w-full">
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">Đăng nhập</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                        (Đăng nhập để truy cập hệ thống thi trắc nghiệm)
                                    </p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400 text-sm">👤</span>
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Nhập email của bạn"
                                                required
                                                className="block w-full pl-10 pr-3 py-3 border-none rounded-lg bg-blue-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Mật khẩu
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-400 text-sm">🔒</span>
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Nhập mật khẩu"
                                                required
                                                className="block w-full pl-10 pr-10 py-3 border-none rounded-lg bg-blue-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            >
                                                {showPassword ? "🙈" : "👁️"}
                                            </button>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <a href="#" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                                Quên mật khẩu?
                                            </a>
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                        Bằng việc đăng nhập, bạn đồng ý với{" "}
                                        <a href="#" className="text-blue-500 hover:underline">Điều khoản dịch vụ</a> và{" "}
                                        <a href="#" className="text-blue-500 hover:underline">Chính sách bảo mật</a>.
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                Đang đăng nhập...
                                            </span>
                                        ) : (
                                            "Đăng nhập"
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Chưa có tài khoản?{" "}
                                        <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                                            Đăng ký ngay
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 dark:bg-slate-900 text-white py-12 border-t border-blue-700 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <h4 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-blue-400 dark:border-slate-600 pb-2 inline-block">Liên hệ</h4>
                            <ul className="space-y-3 text-sm font-light">
                                <li className="flex items-start">
                                    <span className="mr-3 opacity-80">🌐</span>
                                    <span>luyende.vn</span>
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-3 opacity-80">📧</span>
                                    <span>contact@luyende.vn</span>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-blue-400 dark:border-slate-600 pb-2 inline-block">Thông tin</h4>
                            <ul className="space-y-2 text-sm font-light">
                                <li><a href="#" className="hover:text-blue-200 dark:hover:text-blue-300">Giới thiệu</a></li>
                                <li><a href="#" className="hover:text-blue-200 dark:hover:text-blue-300">Điều khoản dịch vụ</a></li>
                                <li><a href="#" className="hover:text-blue-200 dark:hover:text-blue-300">Chính sách bảo mật</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-bold mb-4 uppercase tracking-wider border-b border-blue-400 dark:border-slate-600 pb-2 inline-block">Đăng ký nhận tin</h4>
                            <form className="flex relative">
                                <input
                                    type="email"
                                    placeholder="Nhập email"
                                    className="w-full bg-transparent border border-white dark:border-slate-600 rounded-md py-2 px-3 text-sm placeholder-blue-200 dark:placeholder-gray-400 focus:outline-none focus:bg-blue-700 dark:focus:bg-slate-700"
                                />
                                <button className="absolute right-1 top-1 bottom-1 px-2 text-white hover:text-blue-200">
                                    ✉️
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="border-t border-blue-800 dark:border-slate-700 pt-6 text-center text-xs font-light opacity-70">
                        © 2026 LuyenDe. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
