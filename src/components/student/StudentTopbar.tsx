"use client"

import Link from "next/link"
import { GraduationCap, Flame } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { ThptCountdown } from "@/components/shared/ThptCountdown"
import { GAMIFICATION_ENABLED } from "@/lib/features"

interface StudentTopbarProps {
  readonly name?: string | null
  readonly userXp?: number
  readonly level?: number
  readonly streak?: number
  readonly onLogout: () => void
  readonly nickname?: string | null
  readonly studentClass?: string | null
}

export function StudentTopbar({
  name,
  userXp = 0,
  level = 1,
  streak = 0,
  onLogout,
  nickname,
  studentClass,
}: Readonly<StudentTopbarProps>) {
  const xpInCurrentLevel = userXp % 1000
  const xpNeededForNextLevel = 1000
  const progressPercent = Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--os-border)] bg-[var(--os-card)]">
      {GAMIFICATION_ENABLED ? (
        <div className="h-1.5 w-full bg-[var(--os-bg)] relative overflow-hidden" aria-hidden>
          <div
            className="h-full bg-[var(--os-accent)] transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      ) : (
        <div className="h-1 w-full bg-[var(--os-accent)]" aria-hidden />
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/online-student/dashboard"
          className="group flex items-center gap-3 transition-transform active:scale-95 shrink-0"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--os-border)] bg-[var(--os-bg)] shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:border-[var(--os-accent)]">
            <GraduationCap className="h-4 w-4 text-[var(--os-accent)]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tighter text-[var(--os-fg)] leading-none">
              ExamHub
            </span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--os-accent)]">
              {nickname === "X" ? "Space X" : "Student Hub"}
            </span>
          </div>
        </Link>

        <div className="hidden lg:block">
          <ThptCountdown compact />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {GAMIFICATION_ENABLED && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-1 text-xs font-semibold text-[var(--os-accent)]">
                <span>Cấp {level}</span>
              </div>
              <div className="hidden md:block text-xs font-mono text-[var(--os-muted)]">
                <span className="text-[var(--os-accent)] font-bold">{xpInCurrentLevel}</span>
                <span className="opacity-50">/</span>
                <span>{xpNeededForNextLevel} XP</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-1 text-xs font-semibold text-[var(--os-fg)]">
                <Flame className="h-4 w-4 text-[var(--os-accent)]" />
                <span>{streak} ngày</span>
              </div>
            </>
          )}

          <ThemeToggle />
          <div className="relative border-r border-[var(--os-border)] pr-3">
            <NotificationBell />
          </div>
          <UserMenu
            userName={name || (nickname === "X" ? "Học sinh X" : "Học sinh")}
            userClass={nickname === "X" ? "Lớp X" : (studentClass ?? "Học sinh")}
            onLogout={onLogout}
            role="student"
          />
        </div>
      </div>
    </header>
  )
}
