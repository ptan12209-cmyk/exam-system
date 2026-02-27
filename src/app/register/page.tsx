"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Captcha, useCaptcha } from "@/components/Captcha"
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Phone, BookOpen, Users } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

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
    const { verified: captchaVerified, onVerify: onCaptchaVerify, onExpire: onCaptchaExpire } = useCaptcha()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (!captchaVerified) {
            setError("Vui lòng xác nhận bạn không phải robot")
            setLoading(false)
            return
        }

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

    const inputClasses = "w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="glass-nav sticky top-0 z-50 safe-top">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-foreground">
                            Exam<span className="text-gradient">Hub</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center py-10 px-4 relative">
                {/* Background */}
                <div className="absolute inset-0 gradient-mesh pointer-events-none" />
                <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-violet-400/8 dark:bg-violet-400/5 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-5xl w-full relative z-10">
                    <div className="grid md:grid-cols-5 items-stretch rounded-3xl overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/30 border border-border/50">
                        {/* Left - Branding (narrower) */}
                        <div className="hidden md:flex md:col-span-2 relative p-10 flex-col justify-center overflow-hidden">
                            <div className="absolute inset-0 gradient-primary opacity-95" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.15),transparent_60%)]" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-10 left-10 w-20 h-20 bg-white/5 rounded-full" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6">
                                    <GraduationCap className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-3 leading-tight">
                                    Tạo tài khoản mới
                                </h2>
                                <p className="text-white/60 text-sm leading-relaxed mb-8">
                                    Tham gia cùng hàng ngàn học sinh và giáo viên trên khắp cả nước.
                                </p>
                                <div className="space-y-3">
                                    {["Luyện đề mọi lúc", "Chấm điểm tự động", "Gamification & XP"].map((tag) => (
                                        <div key={tag} className="flex items-center gap-2.5 text-white/70 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            {tag}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right - Form (wider) */}
                        <div className="md:col-span-3 p-8 md:p-10 bg-card">
                            <div className="max-w-md mx-auto w-full">
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-foreground mb-1">Đăng ký</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Điền thông tin bên dưới để tạo tài khoản
                                    </p>
                                </div>

                                <form onSubmit={handleRegister} className="space-y-4">
                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    {/* Role Selection */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setRole("student")}
                                            className={cn(
                                                "p-3.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-3",
                                                role === "student"
                                                    ? "border-indigo-500 gradient-primary-soft"
                                                    : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                                role === "student" ? "bg-indigo-500 text-white" : "bg-muted text-muted-foreground"
                                            )}>
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <span className={cn(
                                                "font-semibold text-sm",
                                                role === "student" ? "text-indigo-700 dark:text-indigo-300" : "text-muted-foreground"
                                            )}>Học sinh</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole("teacher")}
                                            className={cn(
                                                "p-3.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-3",
                                                role === "teacher"
                                                    ? "border-violet-500 bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/15 dark:to-purple-500/15"
                                                    : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                                role === "teacher" ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                                            )}>
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <span className={cn(
                                                "font-semibold text-sm",
                                                role === "teacher" ? "text-violet-700 dark:text-violet-300" : "text-muted-foreground"
                                            )}>Giáo viên</span>
                                        </button>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label htmlFor="fullname" className="block text-sm font-medium text-foreground mb-2">
                                            Họ và tên <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                id="fullname"
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Nguyễn Văn A"
                                                required
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>

                                    {/* Class (student only) */}
                                    {role === "student" && (
                                        <div>
                                            <label htmlFor="className" className="block text-sm font-medium text-foreground mb-2">
                                                Lớp
                                            </label>
                                            <div className="relative">
                                                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    id="className"
                                                    type="text"
                                                    value={className}
                                                    onChange={(e) => setClassName(e.target.value)}
                                                    placeholder="12A1"
                                                    className={inputClasses}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                            Email <span className="text-red-500">*</span>
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
                                                className={inputClasses}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                            Mật khẩu <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Tối thiểu 6 ký tự"
                                                required
                                                minLength={6}
                                                className={cn(inputClasses, "pr-11")}
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

                                    {/* Phone */}
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                                            Số điện thoại
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                id="phone"
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="09xx xxx xxx"
                                                className={inputClasses}
                                            />
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
                                        className={cn(
                                            "w-full py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                            role === "student"
                                                ? "gradient-primary shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:opacity-90"
                                                : "bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/25 hover:shadow-violet-500/35 hover:opacity-90"
                                        )}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Đang đăng ký...
                                            </>
                                        ) : (
                                            <>
                                                Tạo tài khoản
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-6 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Đã có tài khoản?{" "}
                                        <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                                            Đăng nhập
                                        </Link>
                                    </p>
                                </div>

                                <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
                                    Bằng việc đăng ký, bạn đồng ý với{" "}
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
