"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, GraduationCap, Lock } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự")
      return
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
      setTimeout(() => router.replace("/login?reset=1"), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))]/25 px-6 py-4">
        <Link href="/login" className="inline-flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5" /> StudyHub
        </Link>
      </header>
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Đặt mật khẩu mới</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Em đang đặt lại mật khẩu từ link trong email.
        </p>

        {done ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-5 text-sm">
            Đã cập nhật mật khẩu. Đang chuyển về trang đăng nhập…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mật khẩu mới</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3">
                <Lock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={() => setShow((s) => !s)}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Xác nhận mật khẩu</span>
              <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))]/60 px-4 py-3">
                <Lock className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  type={show ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[hsl(var(--foreground))] px-5 py-3.5 text-sm font-semibold text-[hsl(var(--background))] disabled:opacity-50"
            >
              {loading ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
