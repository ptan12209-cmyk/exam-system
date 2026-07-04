"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  FileText, 
  Swords, 
  Trophy, 
  BarChart2, 
  ListTodo, 
  Users, 
  Gift, 
  Bell,
  CalendarDays
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/student/dashboard", label: "Trang Chủ", icon: Home },
  { href: "/student/timetable", label: "Thời Khóa Biểu", icon: CalendarDays },
  { href: "/student/exams", label: "Làm Đề", icon: FileText },
  { href: "/arena", label: "Đấu Trường", icon: Swords },
  { href: "/student/achievements", label: "Thành Tích", icon: Trophy },
  { href: "/student/analytics", label: "Thống Kê", icon: BarChart2 },
  { href: "/student/checklist", label: "Checklist", icon: ListTodo },
  { href: "/student/co-study", label: "Cùng Học", icon: Users },
  { href: "/student/rewards", label: "Phần Thưởng", icon: Gift },
  { href: "/student/notifications", label: "Thông Báo", icon: Bell },
]

export function StudentNavTabs() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/student/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden md:block bg-[#0B0A13] border-b border-[#8C87A2]/20 px-4 py-2.5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 border",
                  active
                    ? "bg-[#C18CFF]/10 border-[#C18CFF] text-[#C18CFF] shadow-[0_0_12px_rgba(193,140,255,0.15)]"
                    : "border-transparent text-[#8C87A2] hover:bg-[#15131F] hover:text-[#F1EDF9] hover:border-[#8C87A2]/30"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
