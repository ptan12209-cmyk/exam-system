"use client"

import { useState } from "react"
import { Headphones, Mail, MessageCircle, X } from "lucide-react"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  supportZaloUrlWithText,
} from "@/lib/support"
import { cn } from "@/lib/utils"

type SupportFabProps = {
  className?: string
  /**
   * Lift above mobile bottom nav (online-student / app chrome).
   * Desktop stays bottom-right.
   */
  offsetBottomNav?: boolean
  /** Prefill Zalo chat message */
  zaloMessage?: string
}

/**
 * Floating support button — Zalo + email.
 * Colors track design brand via --os-* tokens.
 */
export function SupportFab({
  className,
  offsetBottomNav = true,
  zaloMessage = "Xin chào StudyHub, em cần hỗ trợ",
}: SupportFabProps) {
  const [open, setOpen] = useState(false)
  const zaloHref = supportZaloUrlWithText(zaloMessage)

  return (
    <div
      className={cn(
        "fixed right-4 z-[60] flex flex-col items-end gap-2",
        offsetBottomNav
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6"
          : "bottom-5 lg:bottom-6",
        className
      )}
    >
      {open && (
        <div
          className="mb-1 w-60 rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2"
          role="dialog"
          aria-label="Kênh hỗ trợ"
        >
          <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[var(--os-muted)]">
            Hỗ trợ học viên
          </p>
          <a
            href={zaloHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[var(--os-accent)]/30 bg-[var(--os-accent)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--os-fg)] transition-colors hover:bg-[var(--os-accent)]/15"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-[var(--os-accent)]" />
            Zalo {SUPPORT_ZALO}
          </a>
          <a
            href={SUPPORT_EMAIL_URL}
            className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-2.5 text-sm text-[var(--os-fg)] transition-colors hover:border-[var(--os-accent)]/40"
          >
            <Mail className="h-4 w-4 shrink-0 text-[var(--os-muted)]" />
            <span className="truncate text-xs">{SUPPORT_EMAIL}</span>
          </a>
          <p className="mt-2.5 text-[9px] leading-snug text-[var(--os-muted)]">
            Phản hồi trong giờ hành chính. Ghi rõ họ tên và môn đang học để hỗ trợ nhanh hơn.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95",
          open
            ? "border border-[var(--os-border)] bg-[var(--os-card-elevated)] text-[var(--os-fg)]"
            : "bg-[var(--os-accent)] text-[var(--os-accent-fg)] hover:opacity-90"
        )}
        aria-label={open ? "Đóng hỗ trợ" : "Mở hỗ trợ"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
      </button>
    </div>
  )
}
