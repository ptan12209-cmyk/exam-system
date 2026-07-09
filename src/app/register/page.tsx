"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Captcha, useCaptcha } from "@/components/Captcha"
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, Lock, Mail, Phone, Sparkles, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type Role = "student" | "teacher"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<Role>("student")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [className, setClassName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { verified: captchaVerified, onVerify, onExpire } = useCaptcha()

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!captchaVerified) {
      setError("Vui lòng xác nhận bạn không phải robot")
      setLoading(false)
      return
    }

    const normalizedEmail = email.toLowerCase().trim()
    // Whitelist check cho giáo viên (TẠM ẨN)
    /* if (role === "teacher") {
      const { data: whitelistCheck } = await supabase.from("teacher_whitelist").select("id").eq("email", normalizedEmail).single()
      if (!whitelistCheck) {
        setError("Email này chưa được cấp quyền Giáo viên. Vui lòng liên hệ quản trị viên.")
        setLoading(false)
        return
      }
    } */

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: normalizedEmail, password })
    if (authError || !authData.user) {
      setError(authError?.message || "Có lỗi xảy ra khi tạo tài khoản")
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      { id: authData.user.id, role, full_name: fullName, class: role === "student" ? className : null, phone },
      { onConflict: "id" }
    )

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push(role === "teacher" ? "/teacher/online-study" : "/online-student/dashboard")
  }

  const inputClasses = "w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-[500px] w-[500px] rounded-full bg-[hsl(var(--foreground))]/5 blur-[120px]" />
        <div className="absolute right-[-10%] top-1/4 h-[600px] w-[600px] rounded-full bg-[hsl(var(--accent))]/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-1/3 h-[400px] w-[400px] rounded-full bg-[hsl(var(--foreground))]/5 blur-[100px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">StudyHub</span>
          </Link>
          <Link href="/login" className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
            Đăng nhập
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-16 pt-24 md:px-10">
        <div className="grid w-full gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <section className="flex flex-col justify-center">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Sparkles className="h-3.5 w-3.5" /> Đăng ký tài khoản học tập trực tuyến
            </span>
            <h1 className="max-w-2xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">
              Đăng ký
              <span className="mt-3 block max-w-xl font-serif-italic text-3xl leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-5xl">
                "Học nhi thời tập chi, bất diệc duyệt hồ?"
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              "Đường tuy gần không đi không bao giờ đến, việc tuy nhỏ không làm không bao giờ thành. Hãy bắt đầu hành trình tích lũy tri thức ngay hôm nay." – Tuân Tử
            </p>
          </section>

          <section className="rounded-2xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Đăng ký</h2>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Điền thông tin của bạn để bắt đầu học ngay hôm nay.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500">{error}</div>}

              {/* Grid chọn Role (TẠM ẨN - Mặc định học sinh) */}
              {/* <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "student" as Role, label: "Học sinh", icon: BookOpen },
                  { value: "teacher" as Role, label: "Giáo viên", icon: Users },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRole(item.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                      role === item.value ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))]/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "border-[hsl(var(--border))]/60 bg-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
              </div> */}

              <label className="block space-y-2">
                <span className="text-sm font-medium">Họ và tên</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                  <User className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className={inputClasses} required />
                </div>
              </label>

              {role === "student" && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Lớp</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                    <BookOpen className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="12A1" className={inputClasses} />
                  </div>
                </label>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-medium">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                  <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClasses} required />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Mật khẩu</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                  <Lock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    minLength={6}
                    className={inputClasses}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Số điện thoại</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                  <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" className={inputClasses} />
                </div>
              </label>

              <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/30 p-4">
                <Captcha onVerify={onVerify} onExpire={onExpire} theme="auto" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-5 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--background))]/30 border-t-[hsl(var(--background))]" />
                    Đang đăng ký...
                  </>
                ) : (
                  <>
                    Tạo tài khoản <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-medium text-[hsl(var(--foreground))] underline-offset-4 hover:underline">
                Đăng nhập
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
