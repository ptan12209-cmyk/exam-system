"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MARKETING, type ReelDef } from "@/data/marketing-reels"
import { Pause, Play, RotateCcw, Video } from "lucide-react"

type Props = {
  reel: ReelDef
  children?: React.ReactNode
  /** Extra layer that changes with active beat index */
  renderScene?: (beatIndex: number, progress: number) => React.ReactNode
}

/**
 * 9:16 stage + timeline player for recording (OBS / phone screen record).
 */
export function ReelStage({ reel, children, renderScene }: Props) {
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [recordMode, setRecordMode] = useState(false)

  const beatIndex = useMemo(() => {
    let idx = 0
    for (let i = 0; i < reel.beats.length; i++) {
      const b = reel.beats[i]
      if (t >= b.at) idx = i
    }
    return idx
  }, [t, reel.beats])

  const beat = reel.beats[beatIndex]
  const progress = Math.min(1, t / reel.durationSec)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setT((prev) => {
        const next = prev + 0.05
        if (next >= reel.durationSec) {
          setPlaying(false)
          return reel.durationSec
        }
        return next
      })
    }, 50)
    return () => window.clearInterval(id)
  }, [playing, reel.durationSec])

  const restart = useCallback(() => {
    setT(0)
    setPlaying(true)
  }, [])

  return (
    <div
      className={cn(
        "min-h-[100dvh] bg-[#05040a] text-[#f4f0ff]",
        recordMode && "marketing-record-mode"
      )}
    >
      {!recordMode && (
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c18cff]">
              Marketing · {reel.id.toUpperCase()}
            </p>
            <h1 className="text-lg font-semibold tracking-tight">{reel.title}</h1>
            <p className="text-[12px] text-[#8c87a2]">{reel.purpose}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/marketing/reels"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-[#c8c4d8] hover:bg-white/5"
            >
              ← Kit
            </Link>
            <button
              type="button"
              onClick={() => setRecordMode(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c18cff] px-3 py-1.5 text-[12px] font-bold text-[#0b0a13]"
            >
              <Video className="h-3.5 w-3.5" />
              Chế độ quay
            </button>
          </div>
        </header>
      )}

      <div
        className={cn(
          "mx-auto flex flex-col items-center gap-6 px-4 pb-10",
          recordMode && "justify-center min-h-[100dvh] px-0 pb-0"
        )}
      >
        {/* Phone frame 9:16 */}
        <div
          className={cn(
            "relative w-full max-w-[360px] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_30px_80px_rgba(120,60,200,0.25)]",
            recordMode && "max-w-none w-[min(100vw,100dvh*9/16)] rounded-none border-0 shadow-none"
          )}
          style={{ aspectRatio: "9 / 16" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, oklch(0.45 0.16 290 / 0.45), transparent 55%), radial-gradient(ellipse at 80% 80%, oklch(0.35 0.12 320 / 0.35), transparent 50%), #060510",
            }}
          />

          {/* Progress bar */}
          <div className="absolute left-0 right-0 top-0 z-20 h-1 bg-white/10">
            <div
              className="h-full bg-[#c18cff] transition-[width] duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Brand chip */}
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c18cff]/20 text-[13px] font-bold text-[#c18cff]">
              S
            </div>
            <div>
              <p className="text-[12px] font-semibold leading-none">{MARKETING.brand}</p>
              <p className="mt-0.5 text-[10px] text-[#8c87a2]">{MARKETING.domain}</p>
            </div>
          </div>

          {/* Scene */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-16 pt-20">
            {renderScene ? (
              renderScene(beatIndex, progress)
            ) : (
              <div className="text-center">
                <p
                  key={beat.line}
                  className="text-[clamp(1.75rem,8vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-balance animate-in fade-in zoom-in-95 duration-300"
                >
                  {beat.line}
                </p>
                {beat.sub && (
                  <p className="mt-3 text-[15px] leading-relaxed text-[#c8c4d8]/90 text-pretty">
                    {beat.sub}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>

          {/* Bottom CTA strip */}
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
            <p className="text-center text-[11px] font-medium text-[#e8e4f0]">
              {MARKETING.domain} · Zalo {MARKETING.zalo}
            </p>
          </div>
        </div>

        {!recordMode && (
          <>
            {/* Transport */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-[13px] font-semibold hover:bg-white/15"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Tạm dừng" : "Phát"}
              </button>
              <button
                type="button"
                onClick={restart}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-[13px] hover:bg-white/5"
              >
                <RotateCcw className="h-4 w-4" />
                Phát lại
              </button>
              <span className="font-mono text-[12px] tabular-nums text-[#8c87a2]">
                {t.toFixed(1)}s / {reel.durationSec}s
              </span>
            </div>

            {/* Script panel */}
            <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#c18cff]">
                  Voice-over (giọng nam · anh / các em)
                </p>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-[#e8e4f0]/95">
                  {reel.voiceScript}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8c87a2]">
                  Phụ đề (SRT timing)
                </p>
                <ul className="mt-2 space-y-1 font-mono text-[11px] text-[#8c87a2]">
                  {reel.srt.map((s) => (
                    <li key={s.start}>
                      [{s.start.toFixed(1)}–{s.end.toFixed(1)}] {s.text}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[12px] text-[#8c87a2]">
                <strong className="text-[#c8c4d8]">Quay:</strong> bấm «Chế độ quay» → fullscreen /
                OBS crop khung dọc → Phát → đọc voice theo phụ đề. Export 1080×1920, 30fps.
              </p>
            </div>
          </>
        )}

        {recordMode && (
          <button
            type="button"
            onClick={() => {
              setRecordMode(false)
              setPlaying(false)
            }}
            className="fixed bottom-4 right-4 z-50 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur"
          >
            Thoát quay · {t.toFixed(1)}s · Space phát · R lại
          </button>
        )}
      </div>

      {recordMode && (
        <RecordHotkeys
          onToggle={() => setPlaying((p) => !p)}
          onRestart={restart}
        />
      )}
    </div>
  )
}

function RecordHotkeys({
  onToggle,
  onRestart,
}: {
  onToggle: () => void
  onRestart: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        onToggle()
      }
      if (e.key === "r" || e.key === "R") onRestart()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onToggle, onRestart])
  return null
}
