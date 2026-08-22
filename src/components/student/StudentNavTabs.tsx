"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  Home,
  FileText,
  Swords,
  Trophy,
  BarChart2,
  ListTodo,
  Gift,
  Bell,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ARENA_ENABLED,
  CHECKLIST_ENABLED,
  GAMIFICATION_ENABLED,
  TIMETABLE_ENABLED,
} from "@/lib/features"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  gamification?: boolean
  arena?: boolean
  timetable?: boolean
  checklist?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/student/dashboard", label: "Trang Chủ", icon: Home },
  { href: "/student/timetable", label: "Thời Khóa Biểu", icon: CalendarDays, timetable: true },
  { href: "/student/exams", label: "Làm Đề", icon: FileText },
  { href: "/arena", label: "Đấu Trường", icon: Swords, arena: true },
  { href: "/student/achievements", label: "Thành Tích", icon: Trophy, gamification: true },
  { href: "/student/analytics", label: "Thống Kê", icon: BarChart2 },
  { href: "/student/checklist", label: "Checklist", icon: ListTodo, checklist: true },
  { href: "/student/rewards", label: "Phần Thưởng", icon: Gift, gamification: true },
  { href: "/student/notifications", label: "Thông Báo", icon: Bell },
]

export function StudentNavTabs() {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((i) => {
    if (i.gamification && !GAMIFICATION_ENABLED) return false
    if (i.arena && !ARENA_ENABLED) return false
    if (i.timetable && !TIMETABLE_ENABLED) return false
    if (i.checklist && !CHECKLIST_ENABLED) return false
    return true
  })

  const isActive = (href: string) => {
    if (href === "/student/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="hidden md:block border-b border-[var(--os-border)] bg-[var(--os-card)] px-4 py-2.5"
      aria-label="Điều hướng học sinh"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {items.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border",
                  active
                    ? "bg-[var(--os-accent)]/10 border-[var(--os-accent)] text-[var(--os-accent)]"
                    : "border-transparent text-[var(--os-muted)] hover:bg-[var(--os-bg)] hover:text-[var(--os-fg)] hover:border-[var(--os-border)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
