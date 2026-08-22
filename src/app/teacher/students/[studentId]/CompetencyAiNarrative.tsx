"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, Copy, Check } from "lucide-react"

/**
 * Client island: calls the teacher-only AI narrative endpoint and displays
 * the generated review. Aggregates sent to the model are PII-free.
 */
export function CompetencyAiNarrative({ studentId }: { studentId: string }) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setError(null); setLoading(true)
    try {
      const res = await fetch(`/api/teacher/students/${studentId}/competency-report`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi AI")
      setReport(data.report)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[var(--os-accent)]/25 bg-[var(--os-accent)]/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-[var(--os-accent)]" /> Nhận xét năng lực bằng AI
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Chỉ gửi số liệu tổng hợp (không thông tin cá nhân) — thầy/cô duyệt lại trước khi gửi cho phụ huynh.
          </p>
        </div>
        <Button
          onClick={() => void generate()}
          disabled={loading}
          className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold h-11"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {report ? "Viết lại" : "Viết nhận xét"}
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-4 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))] p-4">
          <div className="mb-2 flex items-center justify-end">
            <Button
              variant="ghost" size="sm"
              onClick={async () => {
                try { await navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
              }}
              className="rounded-lg text-xs font-bold text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent p-0 h-auto"
            >
              {copied ? <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? "Đã copy" : "Copy"}
            </Button>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed">{report}</p>
        </div>
      )}
    </section>
  )
}
