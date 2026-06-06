"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Headphones, Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react'

interface AudioPlayerProps {
  url: string
  source: 'upload' | 'youtube' | 'external'
}

export function AudioPlayer({ url, source }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  // YouTube embed video ID parsing
  const getYoutubeEmbedUrl = (embedUrl: string) => {
    // Nếu link đã là embed link, trả về trực tiếp kèm params chặn controls/quảng cáo
    if (embedUrl.includes('youtube.com/embed/')) {
      const parts = embedUrl.split('?')
      const baseUrl = parts[0]
      return `${baseUrl}?controls=1&disablekb=1&rel=0&modestbranding=1&iv_load_policy=3`
    }
    return embedUrl
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    const dur = audioRef.current.duration || 1
    setProgress((cur / dur) * 100)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const seekTo = (Number(e.target.value) / 100) * duration
    audioRef.current.currentTime = seekTo
    setProgress(Number(e.target.value))
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (source === 'youtube') {
    return (
      <div className="glass-card p-4 rounded-2xl border border-white/10 bg-neutral-900/60 space-y-3">
        <div className="flex items-center gap-2.5 text-red-400">
          <YoutubePlayerNotice />
        </div>
        <div className="relative pt-[25%] sm:pt-[15%] w-full rounded-xl overflow-hidden border border-white/10 bg-black">
          <iframe
            src={getYoutubeEmbedUrl(url)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/10 bg-neutral-900/60 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Hệ thống bài nghe IELTS</span>
            <span className="text-xs font-semibold text-foreground block mt-0.5">Vui lòng đeo tai nghe để làm bài đạt hiệu quả tốt nhất</span>
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          {audioRef.current ? formatTime(audioRef.current.currentTime) : '00:00'} / {formatTime(duration)}
        </span>
      </div>

      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        controlsList="nodownload" // Chặn download
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          className="p-3 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold transition-all active:scale-95 shadow-md shadow-violet-500/20 flex items-center justify-center shrink-0"
        >
          {isPlaying ? <Pause className="h-4.5 w-4.5 fill-current" /> : <Play className="h-4.5 w-4.5 fill-current" />}
        </button>

        {/* Progress Bar */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-violet-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 bg-amber-500/5 px-3 py-2 rounded-lg border border-amber-500/10">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Lưu ý: Trong kỳ thi IELTS thực tế, băng ghi âm chỉ được phát duy nhất một lần. Hãy tập trung nghe kỹ!</span>
      </div>
    </div>
  )
}

function YoutubePlayerNotice() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/5 px-3 py-2 rounded-lg border border-red-500/10 w-full">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>Trình phát YouTube: Nhấn play trên video để nghe băng ghi âm của bài thi. Không tua đi tua lại để đảm bảo tính thực tế.</span>
    </div>
  )
}
