"use client"

import { useEffect, useState, type ReactNode } from "react"

interface ProtectedVideoPlayerProps {
  url: string
  watermarkText?: string
  onEnded?: () => void
}

function toEmbedUrl(url: string): string | null {
  if (!url) return null
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0&iv_load_policy=3`
    }
  }
  if (url.includes("mediadelivery.net") || url.includes("bunny.net")) {
    if (url.includes("/play/")) {
      const parts = url.split("/play/")
      if (parts.length === 2) {
        return `https://iframe.mediadelivery.net/embed/${parts[1]}?autoplay=false&preload=true`
      }
    }
    if (url.includes("embed") || url.includes("iframe")) {
      return url
    }
  }
  return null
}

/**
 * Video player with lightweight copyright deterrents (watermark, no context menu).
 * Not full DRM — reduces raw URL exposure is handled separately (playback API phase).
 */
export function ProtectedVideoPlayer({
  url,
  watermarkText,
  onEnded,
}: ProtectedVideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [tick, setTick] = useState("")

  useEffect(() => {
    setEmbedUrl(toEmbedUrl(url))
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

  const shell = (child: ReactNode) => (
    <div
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#8C87A2]/20 bg-black select-none"
      onContextMenu={(e) => {
        e.preventDefault()
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      {child}
      {/* Watermark overlays — multiple positions, low opacity */}
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

  if (embedUrl) {
    return shell(
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        title="Bài giảng video"
      />
    )
  }

  return shell(
    <video
      src={url}
      controls
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onEnded={onEnded}
      className="absolute inset-0 w-full h-full"
      playsInline
    />
  )
}
