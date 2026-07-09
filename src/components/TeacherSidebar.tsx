"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  BarChart3, 
  BookOpen, 
  FileText,
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  LogOut, 
  Plus, 
  Swords, 
  User, 
  GraduationCap,
  LayoutDashboard,
  Database,
  PieChart,
  UserCircle,
  Activity,
  Globe2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface TeacherSidebarProps {
  onLogout?: () => void
  collapsed?: boolean
  setCollapsed?: (collapsed: boolean) => void
}

const NAV_ITEMS = [
  // { href: "/teacher/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  // { href: "/teacher/exams", label: "Đề thi", icon: FileText },
  // { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus },
  { href: "/teacher/online-study", label: "Học liệu online", icon: Globe2 },
]

const MANAGE_ITEMS = [
  { href: "/teacher/profile", label: "Hồ sơ giáo viên", icon: UserCircle },
  // { href: "/teacher/monitor", label: "Giám sát học tập", icon: Activity },
  // { href: "/teacher/study", label: "Quản lý bài học", icon: BookOpen },
  // { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: Database },
  // { href: "/teacher/arena", label: "Đấu trường", icon: Swords },
  // { href: "/teacher/analytics", label: "Thống kê chi tiết", icon: PieChart },
]

function SidebarLink({ 
  href, 
  label, 
  icon: Icon, 
  active, 
  collapsed 
}: { 
  href: string; 
  label: string; 
  icon: any; 
  active: boolean; 
  collapsed: boolean 
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
        collapsed ? "justify-center" : "gap-3",
        active
          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-xl shadow-[hsl(var(--foreground))]/10 scale-[1.02]"
          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50 hover:text-[hsl(var(--foreground))]"
      )}
    >
      <Icon 
        className={cn(
          "h-5 w-5 shrink-0 transition-transform duration-300", 
          active ? "scale-110" : "group-hover:scale-110"
        )} 
        strokeWidth={1.5} 
      />
      {!collapsed && (
        <span className="truncate tracking-tight font-semibold">{label}</span>
      )}
      {active && !collapsed && (
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 opacity-50" />
      )}
      
      {/* Active Indicator Pin */}
      {active && collapsed && (
        <div className="absolute right-0 h-1 w-1 rounded-full bg-[hsl(var(--background))] mr-1" />
      )}
    </Link>
  )
}

export function TeacherSidebar({ onLogout, collapsed: externalCollapsed, setCollapsed: externalSetCollapsed }: TeacherSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  
  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const setCollapsed = externalSetCollapsed !== undefined ? externalSetCollapsed : setInternalCollapsed

  const handleLogout = useCallback(async () => {
    if (onLogout) {
      onLogout()
    } else {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
    }
  }, [onLogout, router])

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-50 hidden h-full flex-col border-r border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/60 backdrop-blur-xl lg:flex", 
        collapsed ? "w-20" : "w-72", 
        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
      )}
    >
      {/* Header / Logo */}
      <div className="p-4 pt-6">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] shadow-sm transition-transform hover:rotate-12">
              <GraduationCap className="h-4 w-4 text-[hsl(var(--foreground))]" strokeWidth={1.2} />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tighter text-[hsl(var(--foreground))] leading-none">ExamHub</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Teacher</span>
              </div>
            )}
          </Link>
          
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-full p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50 hover:text-[hsl(var(--foreground))]"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50 hover:text-[hsl(var(--foreground))]"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="mt-8 flex-1 space-y-1 px-4 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]/60">Main Menu</p>
        )}
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink 
              key={item.href} 
              href={item.href} 
              label={item.label} 
              icon={item.icon} 
              active={pathname === item.href} 
              collapsed={collapsed} 
            />
          ))}
        </div>

        <div className="pt-8">
          {!collapsed && (
            <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]/60">Management</p>
          )}
          <div className="space-y-1">
            {MANAGE_ITEMS.map((item) => (
              <SidebarLink 
                key={item.href} 
                href={item.href} 
                label={item.label} 
                icon={item.icon} 
                active={pathname === item.href || pathname.startsWith(item.href + "/")} 
                collapsed={collapsed} 
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Theme selection / Settings */}
      <div className={cn("p-4 border-t border-[hsl(var(--border))]/10 flex", collapsed ? "justify-center" : "justify-between items-center")}>
        {!collapsed && <span className="text-xs font-semibold text-muted-foreground">Cài đặt giao diện</span>}
        <ThemeToggle side="top" align="left" />
      </div>

      {/* Footer / Logout */}
      <div className="p-4 pt-0">
        <button
          onClick={handleLogout}
          className={cn(
            "group flex w-full items-center rounded-2xl py-3 transition-all duration-300 hover:bg-rose-500/10",
            collapsed ? "justify-center" : "gap-3 px-4"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0 text-rose-500 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-rose-500">Đăng xuất</span>
          )}
        </button>
      </div>
    </aside>
  )
}
