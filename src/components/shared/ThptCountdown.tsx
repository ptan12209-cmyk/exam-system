"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

/** Dự kiến ngày thi THPTQG 2027 — 11/06/2027 07:30 (giờ VN) */
export const THPT_2027_TARGET = new Date("2027-06-11T07:30:00+07:00")

export type CountdownParts = {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

export function getCountdownParts(target: Date = THPT_2027_TARGET): CountdownParts {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, expired: false }
}

type ThptCountdownProps = {
  className?: string
  /** Compact single-row for topbars */
  compact?: boolean
  title?: string
}

/**
 * Live countdown to THPTQG 2027 (days, hours, minutes, seconds).
 * Uses brand tokens (--os-* / HSL) for dual-theme support.
 */
export function ThptCountdown({
  className,
  compact = false,
  title = "Đếm ngược THPT Quốc gia 2027",
}: ThptCountdownProps) {
  const [parts, setParts] = useState<CountdownParts>(() => getCountdownParts())

  useEffect(() => {
    setParts(getCountdownParts())
    const id = window.setInterval(() => setParts(getCountdownParts()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const cells = [
    { label: "Ngày", value: parts.days },
    { label: "Giờ", value: parts.hours },
    { label: "Phút", value: parts.minutes },
    { label: "Giây", value: parts.seconds },
  ]

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] px-3 py-1.5",
          className
        )}
        role="timer"
        aria-live="polite"
        aria-label={title}
      >
        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--os-accent)]" aria-hidden />
        <span className="text-[10px] font-mono tabular-nums text-[var(--os-fg)]">
          {parts.expired ? (
            "Đã đến ngày thi"
          ) : (
            <>
              <span className="text-[var(--os-accent)] font-bold">
                {String(parts.days).padStart(2, "0")}
              </span>
              d{" "}
              <span className="font-semibold">
                {String(parts.hours).padStart(2, "0")}:
                {String(parts.minutes).padStart(2, "0")}:
                {String(parts.seconds).padStart(2, "0")}
              </span>
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-5 sm:p-6 shadow-sm relative overflow-hidden",
        className
      )}
      aria-labelledby="thpt-countdown-title"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--os-accent)]/10 blur-3xl" />

      <div className="relative flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.18em] text-[var(--os-accent)] mb-4 font-semibold">
        <Clock className="h-4 w-4 shrink-0" aria-hidden />
        <h2 id="thpt-countdown-title" className="leading-tight">
          {title}
        </h2>
      </div>

      {parts.expired ? (
        <p className="relative text-lg font-bold text-[var(--os-fg)]">
          Đã đến ngày thi THPTQG dự kiến.
        </p>
      ) : (
        <div
          className="relative grid grid-cols-4 gap-2 sm:gap-3 text-center"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          {cells.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] p-2.5 sm:p-3"
            >
              <span className="block text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-[var(--os-fg)] font-mono">
                {String(item.value).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-[9px] uppercase tracking-wider text-[var(--os-muted)]">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="relative mt-4 text-center text-[10px] text-[var(--os-muted)]">
        Ngày thi dự kiến:{" "}
        <time dateTime="2027-06-11T07:30:00+07:00" className="font-bold text-[var(--os-accent)]">
          11/06/2027 · 07:30
        </time>
      </p>
    </section>
  )
}
