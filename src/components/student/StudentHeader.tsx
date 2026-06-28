"use client"

import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LiveBanner } from "@/components/LiveBanner"

interface StudentHeaderProps {
  readonly name?: string | null
  readonly studentClass?: string | null
  readonly onLogout: () => void
  readonly nickname?: string | null
}

export function StudentHeader({ name, studentClass, onLogout, nickname }: Readonly<StudentHeaderProps>) {
  return (
    <>
    <LiveBanner />
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/90 px-4 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/student/dashboard" className="group flex items-center gap-3 transition-transform active:scale-95">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] shadow-sm transition-transform group-hover:rotate-12">
            <GraduationCap className="h-4 w-4 text-[hsl(var(--foreground))]" strokeWidth={1.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[hsl(var(--foreground))] leading-none">ExamHub</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Student Hub</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <UserMenu 
            userName={name || ""} 
            userClass={studentClass ?? "Học sinh"} 
            onLogout={onLogout} 
            role="student" 
          />
        </div>
      </div>
    </header>
    </>
  )
}
