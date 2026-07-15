"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, MessageSquarePlus } from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { cn } from "@/lib/utils"

interface OnlineStudentTopbarProps {
  readonly name?: string | null
  readonly onLogout: () => void
  readonly nickname?: string | null
}

export function OnlineStudentTopbar({ name, onLogout }: Readonly<OnlineStudentTopbarProps>) {
  const pathname = usePathname()
  const feedbackActive = pathname?.startsWith("/online-student/feedback")

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
          {/* Desktop / tablet: clear text CTA (mobile vẫn có bottom nav) */}
          <Link
            href="/online-student/feedback"
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              feedbackActive
                ? "border-[var(--os-accent)]/40 bg-[var(--os-accent)]/10 text-[var(--os-accent)]"
                : "border-[var(--os-border)] text-[var(--os-muted)] hover:border-[var(--os-accent)]/40 hover:text-[var(--os-fg)]"
            )}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Góp ý
          </Link>
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
