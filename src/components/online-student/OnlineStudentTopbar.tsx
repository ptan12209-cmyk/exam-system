"use client"

import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface OnlineStudentTopbarProps {
  readonly name?: string | null
  readonly onLogout: () => void
  readonly nickname?: string | null
}

export function OnlineStudentTopbar({ name, onLogout }: Readonly<OnlineStudentTopbarProps>) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--os-border)] bg-[var(--os-card)]">
      <div className="h-1 w-full bg-[var(--os-accent)]" aria-hidden />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/online-student/dashboard"
          className="group flex items-center gap-3 transition-transform active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--os-border)] bg-[var(--os-bg)] shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:border-[var(--os-accent)]">
            <GraduationCap className="h-4 w-4 text-[var(--os-accent)]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[var(--os-fg)] leading-none">
              ExamHub
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--os-accent)] font-mono">
              Online Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <div className="relative border-r border-[var(--os-border)] pr-3 sm:pr-4">
            <NotificationBell />
          </div>
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
