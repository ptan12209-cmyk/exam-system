"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

type FeedbackItem = {
  id: string
  category: string
  body: string
  status: string
  teacher_note: string | null
  page_path: string | null
  subject_key: string | null
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
}

const STATUSES = ["all", "new", "seen", "in_progress", "done", "archived"] as const

export default function TeacherFeedbackPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [status, setStatus] = useState<string>("all")
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const q = status === "all" ? "" : `?status=${encodeURIComponent(status)}`
      const res = await fetch(`/api/teacher/feedback${q}`, { credentials: "same-origin" })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data?.error?.message || "Tải thất bại")
      setItems(data.data?.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      if (profile?.role !== "teacher" && profile?.role !== "admin") {
        router.push("/online-student/dashboard")
        return
      }
      load()
    })()
  }, [router, load])

  const patch = async (id: string, patchBody: { status?: string; teacher_note?: string | null }) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/teacher/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patchBody),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data?.error?.message || "Cập nhật thất bại")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cập nhật thất bại")
    } finally {
      setSavingId(null)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <TeacherShell onLogout={handleLogout}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Góp ý học sinh</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xem và xử lý góp ý / báo lỗi từ học viên.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setLoading(true)
                setStatus(s)
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                status === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "Tất cả" : s}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loading label="Đang tải góp ý…" />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">Chưa có góp ý.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">
                      {item.profiles?.full_name || "Học viên"}
                    </span>
                    {item.profiles?.email && (
                      <span className="ml-2 font-mono">{item.profiles.email}</span>
                    )}
                  </div>
                  <span>{new Date(item.created_at).toLocaleString("vi-VN")}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.category}
                  {item.page_path ? ` · ${item.page_path}` : ""}
                  {item.subject_key ? ` · ${item.subject_key}` : ""}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="block flex-1 space-y-1 text-xs">
                    <span className="text-muted-foreground">Ghi chú nội bộ</span>
                    <textarea
                      defaultValue={item.teacher_note || ""}
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      id={`note-${item.id}`}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <select
                      defaultValue={item.status}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      id={`status-${item.id}`}
                    >
                      {STATUSES.filter((s) => s !== "all").map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      disabled={savingId === item.id}
                      className="rounded-xl"
                      onClick={() => {
                        const noteEl = document.getElementById(
                          `note-${item.id}`
                        ) as HTMLTextAreaElement | null
                        const statusEl = document.getElementById(
                          `status-${item.id}`
                        ) as HTMLSelectElement | null
                        void patch(item.id, {
                          status: statusEl?.value,
                          teacher_note: noteEl?.value ?? null,
                        })
                      }}
                    >
                      {savingId === item.id ? "…" : "Lưu"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TeacherShell>
  )
}
