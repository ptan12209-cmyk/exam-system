"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] mb-2">
          Đã xảy ra lỗi
        </h2>

        {/* Description */}
        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-2">
          Hệ thống gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.
        </p>

        {/* Error details (development) */}
        {process.env.NODE_ENV === "development" && error?.message && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left">
            <p className="text-xs font-mono text-red-400 break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-transparent px-5 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-all duration-200 hover:bg-[hsl(var(--muted))]/30 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--background))] transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </a>
        </div>

        {/* Digest for support */}
        {error?.digest && (
          <p className="mt-8 text-[10px] font-mono text-[hsl(var(--muted-foreground))]/50 uppercase tracking-widest">
            Mã lỗi: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
