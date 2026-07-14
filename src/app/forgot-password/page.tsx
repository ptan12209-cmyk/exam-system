"use client"

import { useState } from "react"
import Link from "next/link"
import { Captcha, useCaptcha } from "@/components/Captcha"
import { ArrowLeft, GraduationCap, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const { verified: captchaVerified, token: captchaToken, onVerify, onExpire } = useCaptcha()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (!captchaVerified || !captchaToken) {
      setError("Vui lòng xác nhận captcha")
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), captchaToken }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Không gửi được yêu cầu")
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))]/25 px-6 py-4">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <ArrowLeft className="h-4 w-4" /> Đăng nhập
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="mb-6 flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-semibold">StudyHub</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Quên mật khẩu</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Nhập email đăng ký — hệ thống sẽ gửi link đặt lại mật khẩu nếu tài khoản tồn tại.
        </p>

        {done ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-5 text-sm leading-relaxed">
            Nếu email tồn tại trong hệ thống, em sẽ nhận link đặt lại mật khẩu trong vài phút. Kiểm tra cả hộp thư spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3">
                <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="name@example.com"
                />
              </div>
            </label>
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
              <Captcha onVerify={onVerify} onExpire={onExpire} theme="auto" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[hsl(var(--foreground))] px-5 py-3.5 text-sm font-semibold text-[hsl(var(--background))] disabled:opacity-50"
            >
              {loading ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
