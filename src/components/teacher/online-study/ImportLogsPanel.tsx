"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type ImportLog = {
  id: string
  created_at?: string
  status?: string
  subject?: string
  ok_count?: number
  fail_count?: number
  error_count?: number
  total?: number
  errors?: unknown
  message?: string
  source?: string
  [key: string]: unknown
}

export function ImportLogsPanel() {
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/online-study/import/logs?limit=40")
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.error || "Không tải được log import")
      }
      setLogs((data.data?.logs || []) as ImportLog[])
      setNote(data.data?.note || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải log")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)]/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--os-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--os-fg)]">Import gần đây</h3>
          <p className="text-[11px] text-[var(--os-muted)] mt-0.5">
            Nhật ký import máy (Drive/Bunny). Chỉ xem — không chạy import từ UI.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--os-border)] text-[var(--os-muted)] text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--os-accent)]" />
        </div>
      ) : error ? (
        <p className="p-6 text-sm text-red-400">{error}</p>
      ) : note === "table_missing" ? (
        <p className="p-6 text-sm text-[var(--os-muted)] italic">
          Bảng online_import_logs chưa có trên database. Chạy migration import-sources nếu cần.
        </p>
      ) : logs.length === 0 ? (
        <p className="p-6 text-sm text-[var(--os-muted)] italic">Chưa có log import.</p>
      ) : (
        <ul className="divide-y divide-[var(--os-border)]">
          {logs.map((log) => {
            const open = openId === log.id
            const errs = normalizeErrors(log.errors)
            const created = Number(log.created_count ?? log.ok_count ?? 0)
            const updated = Number(log.updated_count ?? 0)
            const skipped = Number(log.skipped_count ?? 0)
            const fail = Number(log.error_count ?? log.fail_count ?? errs.length)
            const course = log.course_key || log.subject
            return (
              <li key={log.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : log.id)}
                  className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-[var(--os-bg)]/40"
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-[var(--os-muted)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-[var(--os-muted)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-[var(--os-muted)] tabular-nums">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString("vi-VN")
                          : "—"}
                      </span>
                      {course && (
                        <span className="rounded border border-[var(--os-border)] px-1.5 py-0.5 font-mono text-[var(--os-fg)]">
                          {String(course)}
                        </span>
                      )}
                      <span className="text-emerald-400 font-mono">+{created}</span>
                      <span className="text-[var(--os-muted)] font-mono">upd {updated}</span>
                      <span className="text-[var(--os-muted)] font-mono">skip {skipped}</span>
                      <span
                        className={cn(
                          "font-mono",
                          fail > 0 ? "text-red-400" : "text-[var(--os-muted)]"
                        )}
                      >
                        err {fail}
                      </span>
                    </div>
                  </div>
                </button>
                {open && errs.length > 0 && (
                  <div className="px-4 pb-3 pl-10">
                    <ul className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)]/50 p-3">
                      {errs.slice(0, 40).map((e, i) => (
                        <li key={i} className="text-[11px] font-mono text-red-300/90 break-all">
                          {e}
                        </li>
                      ))}
                      {errs.length > 40 && (
                        <li className="text-[10px] text-[var(--os-muted)]">
                          … và {errs.length - 40} lỗi khác
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function normalizeErrors(errors: unknown): string[] {
  if (!errors) return []
  if (Array.isArray(errors)) {
    return errors.map((e) =>
      typeof e === "string" ? e : JSON.stringify(e)
    )
  }
  if (typeof errors === "string") return [errors]
  try {
    return [JSON.stringify(errors)]
  } catch {
    return ["(không đọc được lỗi)"]
  }
}
