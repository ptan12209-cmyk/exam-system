"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, ShieldCheck, X } from "lucide-react"
import { BUNNY_SECURITY_CHECKLIST_ENABLED } from "@/lib/features"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "teacher_bunny_security_checklist_open"

/**
 * Ops checklist for Bunny Stream (teacher-facing, no secrets).
 * Toggle open/closed; preference persisted in localStorage.
 */
export function BunnySecurityChecklist() {
  const [open, setOpen] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === "0" || raw === "false") setOpen(false)
      else if (raw === "1" || raw === "true") setOpen(true)
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const toggle = (next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  if (!BUNNY_SECURITY_CHECKLIST_ENABLED) return null

  // Compact bar when collapsed
  if (ready && !open) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] text-[#C8C4D8]">
          <ShieldCheck className="h-4 w-4 text-amber-300/90" />
          <span className="font-medium text-[#F1EDF9]/90">Checklist bảo mật Bunny</span>
          <span className="text-[10px] text-[#8C87A2]">(đã ẩn)</span>
        </div>
        <button
          type="button"
          onClick={() => toggle(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Hiện checklist
        </button>
      </div>
    )
  }

  return (
    <section
      className={cn(
        "mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5",
        !ready && "opacity-0"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-sm font-bold text-[#F1EDF9]">
              Checklist bảo mật video Bunny
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggle(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-medium text-[#8C87A2] hover:bg-white/5 hover:text-[#F1EDF9]"
                title="Ẩn checklist (có thể hiện lại sau)"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Ẩn
              </button>
              <button
                type="button"
                onClick={() => toggle(false)}
                className="rounded-lg p-1 text-[#8C87A2] hover:bg-white/5 hover:text-[#F1EDF9]"
                aria-label="Đóng checklist"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#8C87A2] leading-relaxed">
            Cấu hình trên{" "}
            <a
              href="https://dash.bunny.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C18CFF] underline underline-offset-2"
            >
              Bunny dashboard
            </a>
            {" "}— app chỉ cấp URL có quyền qua playback API. Domain site:{" "}
            <code className="rounded bg-[#0B0A13] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
              luyende.id.vn
            </code>
          </p>
          <ul className="grid gap-1.5 text-[11px] text-[#C8C4D8] sm:grid-cols-2">
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">1.</span>
              <span>
                Stream library → <strong className="text-[#F1EDF9]">Security</strong> → bật{" "}
                <strong className="text-[#F1EDF9]">Token Authentication</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">2.</span>
              <span>
                Copy <strong className="text-[#F1EDF9]">Token security key</strong> → Vercel env{" "}
                <code className="font-mono text-[10px] text-amber-200">BUNNY_STREAM_TOKEN_KEY</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">3.</span>
              <span>
                Allowed domains:{" "}
                <code className="font-mono text-[10px] text-amber-200">luyende.id.vn</code>
                {" "}+ localhost (dev)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">4.</span>
              <span>Tắt download / block hotlink nếu library hỗ trợ</span>
            </li>
            <li className="flex gap-2 sm:col-span-2">
              <span className="text-amber-400 shrink-0">5.</span>
              <span>
                Dán link <strong className="text-[#F1EDF9]">embed/play</strong> Bunny (app tự chuẩn hóa, bỏ token cũ)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
