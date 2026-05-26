"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

const WORK_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

export function WidgetPomodoroMini() {
  const [timeLeft, setTimeLeft] = useState(WORK_SECONDS)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<"work" | "break">("work")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalSeconds = mode === "work" ? WORK_SECONDS : BREAK_SECONDS
  const progress = 1 - timeLeft / totalSeconds

  // SVG ring geometry
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const switchMode = useCallback((nextMode: "work" | "break") => {
    setMode(nextMode)
    setTimeLeft(nextMode === "work" ? WORK_SECONDS : BREAK_SECONDS)
    setIsRunning(false)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer ended — auto switch mode
          const nextMode = mode === "work" ? "break" : "work"
          // Play notification sound
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 800
            gain.gain.value = 0.15
            osc.start()
            osc.stop(ctx.currentTime + 0.2)
            setTimeout(() => {
              const osc2 = ctx.createOscillator()
              const gain2 = ctx.createGain()
              osc2.connect(gain2)
              gain2.connect(ctx.destination)
              osc2.frequency.value = 1000
              gain2.gain.value = 0.12
              osc2.start()
              osc2.stop(ctx.currentTime + 0.3)
            }, 250)
          } catch {}
          
          switchMode(nextMode)
          return nextMode === "work" ? WORK_SECONDS : BREAK_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, mode, switchMode])

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(mode === "work" ? WORK_SECONDS : BREAK_SECONDS)
  }

  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm">
      {/* Mode toggle */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={() => switchMode("work")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
            mode === "work"
              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/20"
          )}
        >
          <Brain className="h-3.5 w-3.5" /> Học
        </button>
        <button
          onClick={() => switchMode("break")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
            mode === "break"
              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/20"
          )}
        >
          <Coffee className="h-3.5 w-3.5" /> Nghỉ
        </button>
      </div>

      {/* SVG Ring Timer */}
      <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="4"
            opacity="0.2"
          />
          {/* Progress ring */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={mode === "work" ? "hsl(var(--foreground))" : "#22c55e"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="relative text-3xl font-bold tracking-tight tabular-nums">
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--muted))]/20 active:scale-90"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-[hsl(var(--background))] shadow-lg transition-all active:scale-90",
            isRunning 
              ? "bg-amber-500 hover:bg-amber-600" 
              : "bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90"
          )}
          title={isRunning ? "Tạm dừng" : "Bắt đầu"}
        >
          {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
      </div>

      {/* Status text */}
      <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {isRunning
          ? mode === "work"
            ? "Đang tập trung..."
            : "Đang nghỉ ngơi..."
          : "Sẵn sàng"}
      </p>
    </div>
  )
}
