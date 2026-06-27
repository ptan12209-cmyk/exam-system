"use client"

import Link from "next/link"
import { GraduationCap, Flame } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { cn } from "@/lib/utils"

interface StudentTopbarProps {
  readonly name?: string | null
  readonly userXp: number
  readonly level: number
  readonly streak: number
  readonly onLogout: () => void
}

export function StudentTopbar({ name, userXp, level, streak, onLogout }: Readonly<StudentTopbarProps>) {
  // Calculate progress percent to next level
  // Each level requires level * 1000 XP (simplified estimation, matches dashboard page)
  const xpInCurrentLevel = userXp % 1000
  const xpNeededForNextLevel = 1000
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)

  return (
    <header className="sticky top-0 z-50 border-b border-[#2D2D6B]/50 bg-[#0F0F23]/95 backdrop-blur-md">
      {/* Signature Glowing XP Bar running across the very top */}
      <div className="h-1.5 w-full bg-[#1A1A3E] relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#F59E0B] transition-all duration-700 ease-out"
          style={{ 
            width: `${progressPercent}%`,
            boxShadow: "0 0 12px #6366F1, 0 0 24px #6366F180"
          }}
        />
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side Logo */}
        <Link href="/student/X/dashboard" className="group flex items-center gap-3 transition-transform active:scale-95">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2D2D6B] bg-[#1A1A3E] shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:border-[#6366F1]">
            <GraduationCap className="h-4 w-4 text-[#6366F1]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[#F1F5F9] leading-none">ExamHub</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[#6366F1]">
              Space X
            </span>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
          {/* Level Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#2D2D6B] bg-[#1A1A3E] px-3 py-1 text-xs font-semibold text-[#8B5CF6]">
            <span>Cấp {level}</span>
          </div>

          {/* XP text display */}
          <div className="hidden md:block text-xs font-mono text-[#94A3B8]">
            <span className="text-[#F59E0B] font-bold">{xpInCurrentLevel}</span>
            <span className="opacity-50">/</span>
            <span>{xpNeededForNextLevel} XP</span>
          </div>

          {/* Streak Indicator */}
          <div className="flex items-center gap-1 rounded-full border border-[#F97316]/30 bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#F97316] shadow-[0_0_10px_rgba(249,115,22,0.1)] transition-transform hover:scale-105">
            <Flame className="h-4 w-4 fill-[#F97316] animate-pulse" />
            <span>🔥 {streak} ngày</span>
          </div>

          {/* Notification Bell */}
          <div className="relative border-r border-[#2D2D6B]/50 pr-4">
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
