"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Captcha, useCaptcha } from "@/components/Captcha"
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, Sparkles } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { verified: captchaVerified, onVerify, onExpire } = useCaptcha()

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("error") === "profile_not_found") {
        setError("Tài khoản này chưa có thông tin hồ sơ trong hệ thống (có thể do cơ sở dữ liệu đã được làm mới). Vui lòng Đăng ký lại tài khoản này.")
      }
    }
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    if (!captchaVerified) {
      setError("Vui lòng xác nhận bạn không phải robot")
      setLoading(false)
      return
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Đăng nhập thất bại")
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from("profiles").select("role, nickname").eq("id", data.user.id).single()
    if (profile?.role === "teacher") {
      router.push("/teacher/online-study")
    } else {
      router.push("/online-student/dashboard")
    }
  }

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
          <Link href="/register" className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
            Đăng ký
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-16 pt-24 md:px-10">
        <div className="grid w-full gap-12 lg:grid-cols-[1fr_0.92fr] lg:gap-16">
          <section className="flex flex-col justify-center">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Sparkles className="h-3.5 w-3.5" /> Truy cập tài khoản nhanh
            </span>
            <h1 className="max-w-2xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">
              Đăng nhập
              <span className="mt-3 block max-w-xl font-serif-italic text-3xl leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-5xl">
                "Đời người hữu hạn, sự học vô hạn."
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              "Không tích lũy từng bước nhỏ, không thể đi xa vạn dặm; không tích lũy dòng nước nhỏ, không thể thành sông biển." – Tuân Tử
            </p>
          </section>

          <section className="rounded-2xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">Đăng nhập</h2>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Nhập email và mật khẩu để vào đúng dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-500">{error}</div>}

              <label className="block space-y-2">
                <span className="text-sm font-medium">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3 transition-colors focus-within:border-[hsl(var(--foreground))]/60">
                  <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                    required
                  />
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
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="font-medium text-[hsl(var(--foreground))] underline-offset-4 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
