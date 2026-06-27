"use client"

import Link from "next/link"
import { GraduationCap, Flame } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

interface StudentTopbarProps {
  readonly name?: string | null
  readonly userXp: number
  readonly level: number
  readonly streak: number
  readonly onLogout: () => void
}

export function StudentTopbar({ name, userXp, level, streak, onLogout }: Readonly<StudentTopbarProps>) {
  // Calculate progress percent to next level
  const xpInCurrentLevel = userXp % 1000
  const xpNeededForNextLevel = 1000
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)

  return (
    <header className="sticky top-0 z-50 border-b border-[#8C87A2]/20 bg-[#15131F]">
      {/* Signature Glowing XP Bar running across the very top (Flat purple color, no gradient) */}
      <div className="h-1.5 w-full bg-[#0B0A13] relative overflow-hidden">
        <div 
          className="h-full bg-[#C18CFF] transition-all duration-700 ease-out animate-pulse"
          style={{ 
            width: `${progressPercent}%`,
            boxShadow: "0 0 12px #C18CFF, 0 0 24px #C18CFF80"
          }}
        />
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side Logo */}
        <Link href="/student/X/dashboard" className="group flex items-center gap-3 transition-transform active:scale-95">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/40 bg-[#0B0A13] shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:border-[#C18CFF]">
            <GraduationCap className="h-4 w-4 text-[#C18CFF]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[#F1EDF9] leading-none">ExamHub</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[#C18CFF]">
              Space X
            </span>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
          {/* Level Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-3 py-1 text-xs font-semibold text-[#C18CFF]">
            <span>Cấp {level}</span>
          </div>

          {/* XP text display */}
          <div className="hidden md:block text-xs font-mono text-[#8C87A2]">
            <span className="text-[#C18CFF] font-bold">{xpInCurrentLevel}</span>
            <span className="opacity-50">/</span>
            <span>{xpNeededForNextLevel} XP</span>
          </div>

          {/* Streak Indicator (Dream Engine compliant flat colors) */}
          <div className="flex items-center gap-1 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-3 py-1 text-xs font-semibold text-[#F1EDF9] transition-transform hover:scale-105">
            <Flame className="h-4 w-4 fill-[#C18CFF] text-[#C18CFF]" />
            <span>🔥 {streak} ngày</span>
          </div>

          {/* Notification Bell */}
          <div className="relative border-r border-[#8C87A2]/20 pr-4">
            <NotificationBell />
          </div>

          {/* Profile Menu */}
          <UserMenu
            userName={name || "Học sinh X"}
            userClass="Lớp X"
            onLogout={onLogout}
            role="student"
          />
        </div>
      </div>
    </header>
  )
}
