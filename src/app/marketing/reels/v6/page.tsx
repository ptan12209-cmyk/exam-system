"use client"

import { ReelStage } from "@/components/marketing/ReelStage"
import { MARKETING, REELS } from "@/data/marketing-reels"
import { MonitorSmartphone, ShieldCheck, Video } from "lucide-react"

const ICONS = [ShieldCheck, MonitorSmartphone, Video, ShieldCheck, ShieldCheck]

export default function ReelV6Page() {
  const reel = REELS.v6
  return (
    <ReelStage
      reel={reel}
      renderScene={(i) => {
        const beat = reel.beats[i]
        const Icon = ICONS[i] || ShieldCheck
        return (
          <div className="flex w-full flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c18cff]/35 bg-[#c18cff]/12">
              <Icon className="h-8 w-8 text-[#c18cff]" strokeWidth={1.75} />
            </div>
            <p className="text-[clamp(1.65rem,7.5vw,2.4rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-balance">
              {beat.line}
            </p>
            {beat.sub && (
              <p className="mt-3 max-w-[17rem] text-[14px] leading-relaxed text-[#c8c4d8]">
                {beat.sub}
              </p>
            )}
            {i === 3 && (
              <p className="mt-6 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[13px] tracking-wide">
                {MARKETING.zalo}
              </p>
            )}
            {i === 4 && (
              <p className="mt-6 text-[15px] font-semibold text-[#c18cff]">
                {MARKETING.domain}
              </p>
            )}
          </div>
        )
      }}
    />
  )
}
