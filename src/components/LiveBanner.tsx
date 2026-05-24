"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Radio, Video, Youtube, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveConfig {
  is_live: boolean
  title: string | null
  live_mode: "youtube" | "jitsi"
}

export function LiveBanner() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Don't show on the live page itself
  const isOnLivePage = pathname === "/live"

  useEffect(() => {
    const fetchLiveConfig = async () => {
      const { data } = await supabase
        .from("live_config")
        .select("is_live, title, live_mode")
        .single()
      if (data) setLiveConfig(data)
    }

    fetchLiveConfig()

    // Subscribe to realtime changes on live_config
    const channel = supabase
      .channel("live-banner-config")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "live_config" },
        (payload: any) => {
          const newData = payload.new as LiveConfig
          if (newData) setLiveConfig(newData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Don't render if not live, dismissed, or already on live page
  if (!liveConfig?.is_live || dismissed || isOnLivePage) return null

  const ModeIcon = liveConfig.live_mode === "jitsi" ? Video : Youtube

  return (
    <div className="relative z-[60] overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-rose-500">
      {/* Animated background pulse */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15),transparent_70%)] animate-pulse" />
      
      <Link
        href="/live"
        className="relative flex items-center justify-center gap-3 px-4 py-2.5 text-white transition-all hover:bg-white/10"
      >
        {/* Live dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
        </span>

        <Radio className="h-4 w-4 shrink-0 animate-pulse" />
        
        <span className="text-xs sm:text-sm font-semibold truncate">
          {liveConfig.title || "Đang có buổi học trực tuyến!"} — Nhấn để tham gia
        </span>

        <ModeIcon className="h-4 w-4 shrink-0 opacity-70" />
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDismissed(true)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Đóng thông báo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
