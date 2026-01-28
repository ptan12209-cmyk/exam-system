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
    LogOut
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
        <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                    <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
            </div>

            <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    )
                })}

                <div className="pt-4 pb-2">
                    <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quản lý</p>
                </div>

                {MANAGE_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="absolute bottom-6 left-6 right-6">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Đăng xuất
                </button>
            </div>
        </aside>
    )
}
