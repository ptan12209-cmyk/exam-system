"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    GraduationCap,
    BarChart3,
    Plus,
    BookOpen,
    Swords,
    User,
    LogOut,
    ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TeacherSidebarProps {
    onLogout: () => void
}

const NAV_ITEMS = [
    { href: "/teacher/dashboard", label: "Tổng quan", icon: BarChart3 },
    { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus },
]

const MANAGE_ITEMS = [
    { href: "/teacher/profile", label: "Hồ sơ giáo viên", icon: User },
    { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: BookOpen },
    { href: "/teacher/arena", label: "Đấu trường", icon: Swords },
    { href: "/teacher/analytics", label: "Thống kê chi tiết", icon: BarChart3 },
]

export function TeacherSidebar({ onLogout }: TeacherSidebarProps) {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 h-full w-64 glass-sidebar p-5 hidden lg:flex lg:flex-col z-50">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10">
                    <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">ExamHub</span>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && (
                                <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 dark:text-indigo-500" />
                            )}
                        </Link>
                    )
                })}

                <div className="pt-5 pb-2">
                    <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản lý</p>
                </div>

                {MANAGE_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && (
                                <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 dark:text-indigo-500" />
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 w-full font-medium text-sm group"
                >
                    <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    Đăng xuất
                </button>
            </div>
        </aside>
    )
}
