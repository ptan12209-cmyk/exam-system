"use client"

import { ReelStage } from "@/components/marketing/ReelStage"
import { REELS } from "@/data/marketing-reels"

export default function ReelV1Page() {
  const reel = REELS.v1
  return (
    <ReelStage
      reel={reel}
      renderScene={(i) => {
        const beat = reel.beats[i]
        return (
          <div className="flex w-full flex-col items-center text-center">
            {i === 0 && (
              <span className="mb-4 rounded-full border border-[#c18cff]/40 bg-[#c18cff]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#e0c6ff]">
                Dành cho 2k9
              </span>
            )}
            <p
              key={beat.line}
              className="text-[clamp(2rem,9vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance"
            >
              {beat.line}
            </p>
            {beat.sub && (
              <p className="mt-4 max-w-[16rem] text-[15px] leading-snug text-[#c8c4d8]">
                {beat.sub}
              </p>
            )}
            {i >= 2 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {["Toán", "Lý", "Hóa", "ĐGNL"].map((t) => (
                  <span
                    key={t}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#e8e4f0]/90"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
