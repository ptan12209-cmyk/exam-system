"use client"

import { useState } from "react"
import { Headphones, Mail, MessageCircle, X } from "lucide-react"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
} from "@/lib/support"
import { cn } from "@/lib/utils"

/**
 * Floating support button — Zalo + email.
 * Hide on very small payment QR focus optional via className.
 */
export function SupportFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("fixed bottom-5 right-4 z-[60] flex flex-col items-end gap-2", className)}>
      {open && (
        <div className="mb-1 w-56 rounded-2xl border border-[#8C87A2]/25 bg-[#15131F] p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#8C87A2] mb-2">
            Hỗ trợ học viên
          </p>
          <a
            href={SUPPORT_ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[#C18CFF]/25 bg-[#C18CFF]/10 px-3 py-2.5 text-sm font-semibold text-[#F1EDF9] hover:bg-[#C18CFF]/15 transition-colors"
          >
            <MessageCircle className="h-4 w-4 text-[#C18CFF]" />
            Zalo {SUPPORT_ZALO}
          </a>
          <a
            href={SUPPORT_EMAIL_URL}
            className="mt-2 flex items-center gap-2 rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] px-3 py-2.5 text-sm text-[#F1EDF9] hover:border-[#C18CFF]/30 transition-colors"
          >
            <Mail className="h-4 w-4 text-[#8C87A2]" />
            <span className="truncate text-xs">{SUPPORT_EMAIL}</span>
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
          open
            ? "bg-[#8C87A2]/30 border border-[#8C87A2]/40 text-[#F1EDF9]"
            : "bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90"
        )}
        aria-label={open ? "Đóng hỗ trợ" : "Mở hỗ trợ"}
      >
        {open ? <X className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
      </button>
    </div>
  )
}
