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
  Bell 
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/student/X/dashboard", label: "Trang Chủ", icon: Home },
  { href: "/student/exams", label: "Làm Đề", icon: FileText },
  { href: "/arena", label: "Đấu Trường", icon: Swords },
  { href: "/student/achievements", label: "Thành Tích", icon: Trophy },
  { href: "/student/analytics", label: "Thống Kê", icon: BarChart2 },
  { href: "/student/X/checklist", label: "Checklist", icon: ListTodo },
  { href: "/student/co-study", label: "Cùng Học", icon: Users },
  { href: "/student/rewards", label: "Phần Thưởng", icon: Gift },
  { href: "/student/notifications", label: "Thông Báo", icon: Bell },
]

const MOBILE_NAV_ITEMS = [
  { href: "/student/X/dashboard", label: "Trang Chủ", icon: Home },
  { href: "/student/exams", label: "Làm Đề", icon: FileText },
  { href: "/arena", label: "Đấu Trường", icon: Swords },
  { href: "/student/achievements", label: "Thành Tích", icon: Trophy },
  { href: "/student/X/checklist", label: "Checklist", icon: ListTodo },
]

export function StudentNavTabs() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/student/X/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop Horizontal Navigation Tabs */}
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

      {/* Mobile Floating Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#15131F]/95 backdrop-blur-lg border border-[#8C87A2]/25 rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] px-2 py-2">
        <div className="flex justify-between items-center">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all duration-200",
                  active 
                    ? "text-[#C18CFF]" 
                    : "text-[#8C87A2] hover:text-[#F1EDF9]"
                )}
              >
                <item.icon className={cn("h-5 w-5 mb-1", active && "scale-110 drop-shadow-[0_0_6px_rgba(193,140,255,0.4)]")} />
                <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
