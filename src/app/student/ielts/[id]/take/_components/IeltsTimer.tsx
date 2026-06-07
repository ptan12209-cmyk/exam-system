"use client"

import React, { useEffect } from 'react'
import { Clock } from 'lucide-react'

interface IeltsTimerProps {
  durationMinutes: number
  timeSpentSeconds: number
  onTimeUp: () => void
}

export function IeltsTimer({ durationMinutes, timeSpentSeconds, onTimeUp }: IeltsTimerProps) {
  const totalDurationSeconds = durationMinutes * 60
  const remainingSeconds = Math.max(0, totalDurationSeconds - timeSpentSeconds)

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onTimeUp()
    }
  }, [remainingSeconds, onTimeUp])

  const formatTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60

    const hStr = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''
    const mStr = mins.toString().padStart(2, '0')
    const sStr = secs.toString().padStart(2, '0')

    return `${hStr}${mStr}:${sStr}`
  }

  const isLowTime = remainingSeconds <= 5 * 60 // Dưới 5 phút

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
      isLowTime 
        ? 'border-red-500/30 bg-red-500/10 text-red-400 animate-pulse font-extrabold shadow-lg shadow-red-500/5' 
        : 'border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/50 text-foreground font-bold'
    }`}>
      <Clock className={`h-4.5 w-4.5 ${isLowTime ? 'text-red-400' : 'text-cyan-400'}`} />
      <span className="text-sm tracking-widest font-mono">
        {formatTime(remainingSeconds)}
      </span>
    </div>
  )
}
