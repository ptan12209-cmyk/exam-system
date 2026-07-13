"use client"

import { useEffect, useState, type ReactNode } from "react"

interface ProtectedVideoPlayerProps {
  url: string
  watermarkText?: string
  onEnded?: () => void
}

/**
 * Normalize to Bunny embed URL + mobile-safe query params.
 * Official docs: playsinline prevents iOS blank/white player in iframe.
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 */
function toEmbedUrl(url: string): string | null {
  if (!url) return null

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`
    }
  }

  if (url.includes("mediadelivery.net") || url.includes("bunny.net")) {
    try {
      let raw = url.trim()
      // play → embed (keep library/video id)
      if (raw.includes("/play/")) {
        const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
        const afterPlay = u.pathname.split("/play/")[1]
        if (afterPlay) {
          const embed = new URL(
            `https://iframe.mediadelivery.net/embed/${afterPlay.replace(/^\//, "")}`
          )
          u.searchParams.forEach((v, k) => embed.searchParams.set(k, v))
          raw = embed.toString()
        }
      }

      // Already embed (iframe. or player. host)
      if (raw.includes("/embed/") || raw.includes("iframe.mediadelivery.net") || raw.includes("player.mediadelivery.net")) {
        const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
        // Prefer iframe host we already store; player.* also works per Bunny docs
        if (u.hostname === "player.mediadelivery.net") {
          u.hostname = "iframe.mediadelivery.net"
        }
        // Mobile Safari: without playsinline the iframe often paints white
        if (!u.searchParams.has("playsinline")) {
          u.searchParams.set("playsinline", "true")
        }
        if (!u.searchParams.has("preload")) {
          u.searchParams.set("preload", "true")
        }
        // Don't force autoplay on mobile (blocked); explicit false is safer
        if (!u.searchParams.has("autoplay")) {
          u.searchParams.set("autoplay", "false")
        }
        return u.toString()
      }
    } catch {
      if (url.includes("embed") || url.includes("iframe")) return url
    }
  }

  return null
}

/**
 * Video player with lightweight copyright deterrents (watermark, no context menu).
 * Mobile: padding-top 16:9 shell + playsinline (fixes white iframe on iOS/Android).
 */
export function ProtectedVideoPlayer({
  url,
  watermarkText,
  onEnded,
}: ProtectedVideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [tick, setTick] = useState("")
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    setEmbedUrl(toEmbedUrl(url))
    setIframeError(false)
  }, [url])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTick(
        now.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        })
      )
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  const mark = [watermarkText, tick].filter(Boolean).join(" · ")

  // paddingTop 56.25% is more reliable than aspect-video on some mobile WebViews
  const shell = (child: ReactNode) => (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[#8C87A2]/20 bg-black select-none"
      style={{ paddingTop: "56.25%" }}
      onContextMenu={(e) => {
        e.preventDefault()
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {child}
      {mark && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-[0.14]">
            <span className="rotate-[-18deg] text-xs sm:text-sm font-mono text-white whitespace-nowrap">
              {mark}
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 opacity-40">
            <span className="rounded bg-black/40 px-2 py-0.5 text-[9px] font-mono text-white/90">
              {mark}
            </span>
          </div>
        </>
      )}
      <div className="pointer-events-none absolute top-2 left-2 z-10 rounded bg-black/50 px-2 py-0.5 text-[9px] font-mono text-white/70">
        © StudyHub · Bản quyền
      </div>
    </div>
  )

  if (embedUrl && !iframeError) {
    return (
      <div className="space-y-2">
        {shell(
          <iframe
            src={embedUrl}
            className="absolute inset-0 h-full w-full border-0"
            style={{ border: "none" }}
            // fullscreen + autoplay + encrypted-media required by modern Bunny player
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            allowFullScreen
            // origin-only referrer still satisfies most Bunny Allowed Referrers rules
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            title="Bài giảng video"
          />
        )}
        {/* Fallback if iframe blocked (in-app browser / referrer) */}
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[11px] text-[#C18CFF] underline underline-offset-2 sm:hidden"
        >
          Video trắng? Chạm để mở trình phát full màn hình
        </a>
      </div>
    )
  }

  return shell(
    <video
      src={url}
      controls
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      playsInline
      webkit-playsinline="true"
      preload="metadata"
      onEnded={onEnded}
      onError={() => setIframeError(true)}
      className="absolute inset-0 h-full w-full"
    />
  )
}
