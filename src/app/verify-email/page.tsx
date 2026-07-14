"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  getGraceDaysRemaining,
  isEmailVerified,
  isVerificationBlocked,
} from "@/lib/email-verify"
import { GraduationCap, Mail, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

function VerifyEmailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason")
  const supabase = createClient()

  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [graceDays, setGraceDays] = useState<number | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login?redirectTo=/verify-email")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, email_verified_at, account_source, created_at, role, full_name")
        .eq("id", user.id)
        .single()

      if (cancelled) return
      if (profile && isEmailVerified(profile)) {
        router.replace("/online-student/dashboard")
        return
      }
      setEmail(profile?.email || user.email || null)
      setGraceDays(getGraceDaysRemaining(profile?.created_at))
      setBlocked(isVerificationBlocked(profile))

      // Daily warning once per calendar day
      if (typeof window !== "undefined") {
        const key = `verify_warn_${new Date().toISOString().slice(0, 10)}`
        if (!localStorage.getItem(key) && (isVerificationBlocked(profile) || reason === "deadline")) {
          localStorage.setItem(key, "1")
          setInfo("Hôm nay: tài khoản cần xác thực email để tiếp tục học an toàn.")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, supabase, reason])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "same-origin",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Xác thực thất bại")
      }
      router.replace("/online-student/dashboard?verified=1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực thất bại")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        credentials: "same-origin",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Không gửi được mã")
      }
      setInfo("Đã gửi lại mã OTP 4 số tới email của em.")
      setCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi lại thất bại")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col">
      <header className="border-b border-[hsl(var(--border))]/25 px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          <span className="font-semibold">StudyHub</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))]/40 p-6 sm:p-8 space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--muted))]/40">
            {blocked ? (
              <ShieldAlert className="h-6 w-6 text-amber-500" />
            ) : (
              <Mail className="h-6 w-6" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Xác thực email</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {blocked
                ? "Đã quá 5 ngày chưa xác thực — tài khoản tạm hạn chế. Nhập mã OTP 4 số để tiếp tục học."
                : graceDays !== null && graceDays >= 0
                  ? `Em còn ${graceDays} ngày để xác thực email. Vẫn học bình thường trong thời gian này.`
                  : "Nhập mã OTP 4 số đã gửi tới email đăng ký."}
            </p>
            {email && (
              <p className="mt-1 text-xs font-mono text-[hsl(var(--muted-foreground))]">{email}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-600">
              {info}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mã OTP (4 số)</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-transparent px-4 py-3 text-center text-2xl tracking-[0.4em] font-semibold outline-none focus:border-[hsl(var(--foreground))]/50"
                required
              />
            </label>
            <Button
              type="submit"
              disabled={loading || code.length !== 4}
              className="w-full rounded-full"
            >
              {loading ? "Đang xác thực…" : "Xác thực"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-50"
          >
            {cooldown > 0
              ? `Gửi lại mã sau ${cooldown}s`
              : resending
                ? "Đang gửi…"
                : "Gửi lại mã OTP"}
          </button>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
            <Link href="/online-student/dashboard" className="underline-offset-4 hover:underline">
              Về trang chủ
            </Link>
            {" · "}
            <button
              type="button"
              className="underline-offset-4 hover:underline"
              onClick={async () => {
                await supabase.auth.signOut()
                router.replace("/login")
              }}
            >
              Đăng xuất
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          Đang tải…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}
