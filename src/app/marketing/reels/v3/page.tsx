"use client"

import { ReelStage } from "@/components/marketing/ReelStage"
import { INTRO_SUBJECTS } from "@/data/courses-intro"
import { REELS } from "@/data/marketing-reels"

const STEM = INTRO_SUBJECTS.filter((s) => s.group === "stem")
const SOCIAL = INTRO_SUBJECTS.filter((s) => s.group === "social")
const LANG = INTRO_SUBJECTS.filter((s) => s.group === "language")
const DGNL = INTRO_SUBJECTS.filter((s) => s.group === "dgnl")

function ChipGrid({
  items,
}: {
  items: { icon: string; label: string }[]
}) {
  return (
    <div className="mt-5 grid w-full max-w-[280px] grid-cols-2 gap-2">
      {items.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left"
        >
          <span className="text-lg">{s.icon}</span>
          <span className="truncate text-[12px] font-medium leading-tight">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReelV3Page() {
  const reel = REELS.v3
  return (
    <ReelStage
      reel={reel}
      renderScene={(i) => {
        const beat = reel.beats[i]
        return (
          <div className="flex w-full flex-col items-center text-center">
            <p className="text-[clamp(1.65rem,7vw,2.25rem)] font-semibold leading-[1.12] tracking-tight">
              {beat.line}
            </p>
            {beat.sub && (
              <p className="mt-2 text-[13px] text-[#8c87a2]">{beat.sub}</p>
            )}
            {i === 1 && <ChipGrid items={STEM.map((s) => ({ icon: s.icon, label: s.label }))} />}
            {i === 2 && (
              <ChipGrid
                items={[
                  ...SOCIAL.map((s) => ({ icon: s.icon, label: s.label })),
                  ...LANG.map((s) => ({ icon: s.icon, label: s.label })),
                ]}
              />
            )}
            {i === 3 && <ChipGrid items={DGNL.map((s) => ({ icon: s.icon, label: s.label }))} />}
            {(i === 0 || i === 4) && (
              <p className="mt-8 text-[12px] text-[#c8c4d8]/80">
                {INTRO_SUBJECTS.length} mục · có list giáo viên trên web
              </p>
            )}
          </div>
        )
      }}
    />
  )
}
