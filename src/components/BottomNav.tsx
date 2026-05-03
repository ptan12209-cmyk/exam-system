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
        <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-[transform,color,background-color,box-shadow] duration-200",
                                isActive
                                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg shadow-black/10"
                                    : "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                            )}
                        >

                            <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={1.2} />
                            <span className={cn("transition-[font-weight,opacity] duration-200", isActive && "font-semibold")}>{item.label}</span>
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
        <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
            <div className="flex h-16 items-center justify-around px-2">
                {teacherNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href.replace("/create", ""))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-[transform,color,background-color,box-shadow] duration-200",
                                isActive
                                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg shadow-black/10"
                                    : "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                            )}
                        >

                            <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={1.2} />
                            <span className={cn("transition-[font-weight,opacity] duration-200", isActive && "font-semibold")}>{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
