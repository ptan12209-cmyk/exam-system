"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/shared/Loading"

const CATEGORIES = [
  { value: "bug", label: "Báo lỗi" },
  { value: "idea", label: "Góp ý cải tiến" },
  { value: "praise", label: "Khen / hài lòng" },
  { value: "other", label: "Khác" },
] as const

export default function StudentFeedbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("idea")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [history, setHistory] = useState<
    Array<{ id: string; category: string; body: string; status: string; created_at: string }>
  >([])

  useEffect(() => {
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
      if (!profile || (profile.role !== "student" && profile.role !== "online_student")) {
        router.push("/login")
        return
      }
      setName(profile.full_name)
      setLoadingAuth(false)
      try {
        const res = await fetch("/api/feedback", { credentials: "same-origin" })
        const data = await res.json()
        if (res.ok && data.success) setHistory(data.data?.items || [])
      } catch {
        /* ignore */
      }
    })()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          category,
          body: body.trim(),
          page_path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Gửi thất bại")
      }
      setSuccess(data.data?.message || "Đã gửi góp ý")
      setBody("")
      const res2 = await fetch("/api/feedback", { credentials: "same-origin" })
      const d2 = await res2.json()
      if (res2.ok && d2.success) setHistory(d2.data?.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi thất bại")
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label="Đang tải…" />
      </div>
    )
  }

  const statusLabel: Record<string, string> = {
    new: "Mới",
    seen: "Đã xem",
    in_progress: "Đang xử lý",
    done: "Đã xử lý",
    archived: "Lưu trữ",
  }

  return (
    <OnlineStudentShell supportMessage="Góp ý StudyHub">
      <OnlineStudentTopbar name={name} onLogout={handleLogout} />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">Góp ý hệ thống</h1>
        <p className="mt-1 text-sm text-[var(--os-muted)]">
          Em góp ý / báo lỗi để thầy cải thiện StudyHub. Thầy xem trực tiếp trong trang giáo viên.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {success}
            </div>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-medium">Loại</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nội dung</span>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Mô tả rõ để thầy dễ xử lý…"
              className="w-full rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--os-accent)]"
            />
          </label>
          <Button type="submit" disabled={sending} className="rounded-xl">
            {sending ? "Đang gửi…" : "Gửi góp ý"}
          </Button>
        </form>

        {history.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--os-muted)]">
              Góp ý gần đây
            </h2>
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--os-muted)]">
                  <span>{CATEGORIES.find((c) => c.value === item.category)?.label || item.category}</span>
                  <span>{statusLabel[item.status] || item.status}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[var(--os-fg)]">{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </OnlineStudentShell>
  )
}
