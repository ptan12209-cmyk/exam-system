"use client"

import Link from "next/link"
import { GraduationCap, LogOut, User } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

interface OnlineStudentTopbarProps {
  readonly name?: string | null
  readonly onLogout: () => void
  readonly nickname?: string | null
}

export function OnlineStudentTopbar({ name, onLogout, nickname }: Readonly<OnlineStudentTopbarProps>) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#8C87A2]/20 bg-[#15131F]">
      {/* Decorative Accent line running across the very top (Dream Violet #C18CFF) */}
      <div className="h-1 w-full bg-[#C18CFF]" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side Logo */}
        <Link href="/online-student/dashboard" className="group flex items-center gap-3 transition-transform active:scale-95">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/40 bg-[#0B0A13] shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:border-[#C18CFF]">
            <GraduationCap className="h-4 w-4 text-[#C18CFF]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[#F1EDF9] leading-none">ExamHub</span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[#C18CFF] font-mono">
              Online Portal
            </span>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative border-r border-[#8C87A2]/20 pr-4">
            <NotificationBell />
          </div>

          {/* Profile Menu */}
          <UserMenu
            userName={name || "Học sinh Online"}
            userClass="Học viên Online"
            onLogout={onLogout}
            role="student"
          />
        </div>
      </div>
    </header>
  )
}
