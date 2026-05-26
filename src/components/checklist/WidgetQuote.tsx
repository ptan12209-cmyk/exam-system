"use client"

import { useState, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import { QUOTES } from "@/data/quotes"

export function WidgetQuote() {
  const [offset, setOffset] = useState(0)

  const dayOfYear = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const diff = now.getTime() - start.getTime()
    return Math.floor(diff / 86400000)
  }, [])

  const quote = QUOTES[(dayOfYear + offset) % QUOTES.length]

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm">
      {/* Decorative quotation mark */}
      <span className="pointer-events-none absolute -top-2 left-4 text-7xl font-serif leading-none text-[hsl(var(--foreground))]/[0.04] select-none">
        &ldquo;
      </span>

      <div className="relative z-10">
        <p className="text-sm italic leading-relaxed text-[hsl(var(--foreground))]/80">
          {quote.text}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
            — {quote.author}
          </p>
          <button
            onClick={() => setOffset((prev) => prev + 1)}
            className="rounded-full p-1.5 text-[hsl(var(--muted-foreground))]/50 transition-all hover:bg-[hsl(var(--muted))]/20 hover:text-[hsl(var(--foreground))] active:scale-90"
            title="Xem câu nói khác"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
