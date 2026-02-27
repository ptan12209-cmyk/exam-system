"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Captcha, useCaptcha } from "@/components/Captcha"
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { verified: captchaVerified, onVerify: onCaptchaVerify, onExpire: onCaptchaExpire } = useCaptcha()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!captchaVerified) {
            setError("Vui lòng xác nhận bạn không phải robot")
            setLoading(false)
            return
        }

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
        <div className="min-h-screen flex flex-col bg-background">
            {/* Minimal Header */}
            <header className="glass-nav sticky top-0 z-50 safe-top">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-foreground">
                            Exam<span className="text-gradient">Hub</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/register" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Đăng ký
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center py-12 px-4 relative">
                {/* Background */}
                <div className="absolute inset-0 gradient-mesh pointer-events-none" />
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-400/8 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-400/8 dark:bg-violet-400/5 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-5xl w-full relative z-10">
                    <div className="grid md:grid-cols-2 items-stretch rounded-3xl overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/30 border border-border/50">
                        {/* Left - Branding */}
                        <div className="relative p-10 md:p-12 flex flex-col justify-center overflow-hidden">
                            <div className="absolute inset-0 gradient-primary opacity-95" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
                            <div className="absolute top-10 right-10 w-24 h-24 bg-white/5 rounded-full" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8">
                                    <GraduationCap className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                    Chào mừng<br />trở lại!
                                </h2>
                                <p className="text-white/70 text-lg leading-relaxed mb-8">
                                    Tiếp tục hành trình chinh phục kiến thức với ExamHub.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    {["Luyện đề thông minh", "Chấm tự động", "Bảng xếp hạng"].map((tag) => (
                                        <span key={tag} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right - Form */}
                        <div className="p-8 md:p-12 bg-card flex flex-col justify-center">
                            <div className="max-w-sm mx-auto w-full">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold text-foreground mb-1">Đăng nhập</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Nhập thông tin tài khoản để tiếp tục
                                    </p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                required
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                                Mật khẩu
                                            </label>
                                            <a href="#" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                                Quên mật khẩu?
                                            </a>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full pl-10 pr-11 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* CAPTCHA */}
                                    <div className="py-1">
                                        <Captcha
                                            onVerify={onCaptchaVerify}
                                            onExpire={onCaptchaExpire}
                                            theme="auto"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full gradient-primary hover:opacity-90 text-white py-3 px-4 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang đăng nhập...
                                            </>
                                        ) : (
                                            <>
                                                Đăng nhập
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Chưa có tài khoản?{" "}
                                        <Link href="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                            Đăng ký miễn phí
                                        </Link>
                                    </p>
                                </div>

                                <p className="mt-4 text-[11px] text-muted-foreground text-center leading-relaxed">
                                    Bằng việc đăng nhập, bạn đồng ý với{" "}
                                    <a href="#" className="text-indigo-500 hover:underline">Điều khoản</a> và{" "}
                                    <a href="#" className="text-indigo-500 hover:underline">Chính sách bảo mật</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
