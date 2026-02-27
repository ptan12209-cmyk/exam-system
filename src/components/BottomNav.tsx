"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, Trophy, User, Swords } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/student/dashboard", icon: Home, label: "Trang chủ" },
    { href: "/student/exams", icon: FileText, label: "Đề thi" },
    { href: "/arena", icon: Swords, label: "Đấu trường" },
    { href: "/student/achievements", icon: Trophy, label: "Thành tựu" },
    { href: "/student/profile", icon: User, label: "Hồ sơ" },
]

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav lg:hidden safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 touch-target relative",
                                isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95"
                            )}
                        >
                            {isActive && (
                                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full gradient-primary" />
                            )}
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                isActive && "scale-110"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium transition-all",
                                isActive && "font-semibold"
                            )}>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

// Teacher version
const teacherNavItems = [
    { href: "/teacher/dashboard", icon: Home, label: "Dashboard" },
    { href: "/teacher/exams/create", icon: FileText, label: "Tạo đề" },
    { href: "/teacher/arena", icon: Swords, label: "Đấu trường" },
    { href: "/teacher/analytics", icon: Trophy, label: "Thống kê" },
    { href: "/teacher/profile", icon: User, label: "Hồ sơ" },
]

export function TeacherBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav lg:hidden safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-1">
                {teacherNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href.replace("/create", ""))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 touch-target relative",
                                isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95"
                            )}
                        >
                            {isActive && (
                                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full gradient-primary" />
                            )}
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200",
                                isActive && "scale-110"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium transition-all",
                                isActive && "font-semibold"
                            )}>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
