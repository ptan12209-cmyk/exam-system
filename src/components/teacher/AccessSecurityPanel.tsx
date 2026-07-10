"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  ShieldAlert,
  Activity,
  RefreshCw,
  AlertTriangle,
  Eye,
  FileText,
} from "lucide-react"

type AccessLogRow = {
  id: string
  user_id: string | null
  lesson_id: string | null
  action: string
  ip: string | null
  user_agent: string | null
  meta: Record<string, unknown> | null
  created_at: string
  profiles?: { id: string; full_name: string | null; email: string | null } | null
  online_lessons?: { id: string; title: string | null } | null
}

type AnomalyRow = {
  kind: string
  severity: "medium" | "high"
  user_id: string
  message: string
  detail: Record<string, unknown>
  user?: { full_name: string | null; email: string | null } | null
}

export function AccessSecurityPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<AccessLogRow[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([])
  const [total, setTotal] = useState(0)
  const [hours, setHours] = useState(24)
  const [actionFilter, setActionFilter] = useState<"" | "playback" | "document">("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        limit: "80",
        hours: String(hours),
      })
      if (actionFilter) qs.set("action", actionFilter)
      const res = await fetch(`/api/online-study/access-logs?${qs}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(
          data?.error?.message || data?.error || "Không tải được access logs"
        )
      }
      setLogs(data.data.logs || [])
      setAnomalies(data.data.anomalies || [])
      setTotal(data.data.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu")
      setLogs([])
      setAnomalies([])
    } finally {
      setLoading(false)
    }
  }, [hours, actionFilter])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      {/* Anomaly cards */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <div>
              <h2 className="text-sm font-bold text-[#F1EDF9]">
                Cảnh báo bất thường (V4c)
              </h2>
              <p className="text-[11px] text-[#8C87A2]">
                Multi-IP · volume cao · burst 10 phút — cửa sổ {hours}h
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="h-9 rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] px-2 text-xs text-[#F1EDF9]"
            >
              <option value={24}>24 giờ</option>
              <option value={48}>48 giờ</option>
              <option value={168}>7 ngày</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void load()}
              className="h-9 rounded-lg border border-[#8C87A2]/25 text-[#8C87A2]"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Làm mới
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#C18CFF]" />
          </div>
        ) : anomalies.length === 0 ? (
          <p className="text-xs text-emerald-400/90 py-4 text-center">
            Không phát hiện bất thường trong cửa sổ đã chọn.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {anomalies.map((a, i) => (
              <div
                key={`${a.user_id}-${a.kind}-${i}`}
                className={`rounded-xl border p-3 ${
                  a.severity === "high"
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-3.5 w-3.5 shrink-0 ${
                          a.severity === "high" ? "text-red-400" : "text-amber-400"
                        }`}
                      />
                      <span className="text-[10px] font-mono uppercase text-[#8C87A2]">
                        {a.kind} · {a.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#F1EDF9] mt-1">
                      {a.user?.full_name || "Học viên"}{" "}
                      <span className="text-[11px] font-normal text-[#8C87A2]">
                        {a.user?.email || a.user_id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#C8C4D8] mt-0.5">{a.message}</p>
                    {Array.isArray(a.detail.ips) && a.detail.ips.length > 0 && (
                      <p className="text-[10px] font-mono text-[#8C87A2] mt-1 truncate">
                        IP: {(a.detail.ips as string[]).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access log table */}
      <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/10 overflow-hidden">
        <div className="p-4 border-b border-[#8C87A2]/20 bg-[#15131F]/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#C18CFF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
              Access logs (V4a)
            </span>
            <span className="text-[10px] bg-[#0B0A13] px-2 py-0.5 rounded border border-[#8C87A2]/20 text-[#8C87A2] font-mono">
              {total} bản ghi
            </span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) =>
              setActionFilter(e.target.value as "" | "playback" | "document")
            }
            className="h-8 rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] px-2 text-xs text-[#F1EDF9]"
          >
            <option value="">Tất cả action</option>
            <option value="playback">playback</option>
            <option value="document">document</option>
          </select>
        </div>

        {error && (
          <div className="p-4 text-xs text-red-400 border-b border-red-500/20 bg-red-500/5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
            <p className="mt-2 text-xs text-[#8C87A2]">Đang tải logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-sm text-[#8C87A2] italic">
            Chưa có lượt truy cập được ghi nhận.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#8C87A2]/10 bg-[#0B0A13]/30 text-[#8C87A2] uppercase font-mono tracking-wider">
                  <th className="p-3 font-bold">Thời gian</th>
                  <th className="p-3 font-bold">Học viên</th>
                  <th className="p-3 font-bold">Bài học</th>
                  <th className="p-3 font-bold">Action</th>
                  <th className="p-3 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8C87A2]/10">
                {logs.map((row) => {
                  const name =
                    row.profiles?.full_name ||
                    row.profiles?.email ||
                    (row.user_id ? row.user_id.slice(0, 8) : "—")
                  const lesson = row.online_lessons?.title || "—"
                  return (
                    <tr key={row.id} className="hover:bg-[#15131F]/40">
                      <td className="p-3 font-mono text-[#8C87A2] whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-[#F1EDF9]">{name}</p>
                        {row.profiles?.email && (
                          <p className="text-[10px] text-[#8C87A2]">
                            {row.profiles.email}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-[#F1EDF9] max-w-[200px] truncate">
                        {lesson}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-mono text-[10px] ${
                            row.action === "document"
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                              : "border-[#C18CFF]/30 text-[#C18CFF] bg-[#C18CFF]/10"
                          }`}
                        >
                          {row.action === "document" ? (
                            <FileText className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {row.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#8C87A2]">
                        {row.ip || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#8C87A2] leading-relaxed">
        V4b: tài liệu trên Supabase Storage được cấp signed URL TTL ngắn khi playback/mở.
        Link ngoài (Drive, Bunny file…) vẫn mở qua proxy có audit — nên chuyển PDF quan trọng
        sang bucket private Supabase để ký URL.
      </p>
    </div>
  )
}
