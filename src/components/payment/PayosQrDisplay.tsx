"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Loader2 } from "lucide-react"

interface PayosQrDisplayProps {
  /** EMVCo / QR payload string from payOS `qrCode` field */
  value: string
  size?: number
  className?: string
}

/**
 * Render payOS QR locally (no third-party QR image host, large enough to scan).
 */
export function PayosQrDisplay({ value, size = 320, className = "" }: PayosQrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setError(null)

    if (!value) {
      setError("Thiếu dữ liệu QR")
      return
    }

    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0A13", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch((e) => {
        console.error("[PayosQrDisplay]", e)
        if (!cancelled) setError("Không tạo được mã QR")
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white/5 border border-red-500/30 text-red-400 text-sm p-6 ${className}`}
        style={{ width: size, height: size, maxWidth: "100%" }}
      >
        {error}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-white ${className}`}
        style={{ width: size, height: size, maxWidth: "100%" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Mã QR thanh toán"
      width={size}
      height={size}
      className={`rounded-2xl bg-white p-3 shadow-lg mx-auto ${className}`}
      style={{ width: "min(100%, " + size + "px)", height: "auto" }}
    />
  )
}
