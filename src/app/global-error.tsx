"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"

/**
 * Root error boundary — captures render errors to Sentry (when configured)
 * and offers a full reload as the only recovery (layout itself failed).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0B0A13",
          color: "#F1EDF9",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: 480 }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Đã xảy ra lỗi
          </h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, marginBottom: "1.5rem" }}>
            Hệ thống gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
            {error.digest ? ` Mã lỗi: ${error.digest}` : null}
          </p>
          <Button onClick={reset}>Tải lại trang</Button>
        </div>
      </body>
    </html>
  )
}
