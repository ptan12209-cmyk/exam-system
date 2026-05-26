"use client"

import { LucideIcon, Home, FileText, ListTodo, User, Swords, Eye } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavItem {
    href: string
    label: string
    icon: LucideIcon
    activePattern?: RegExp
}

const studentNavItems: NavItem[] = [
    {
        href: "/student/dashboard",
        label: "Trang chủ",
        icon: Home,
        activePattern: /^\/student\/dashboard/
    },
    {
        href: "/student/exams",
        label: "Đề thi",
        icon: FileText,
        activePattern: /^\/student\/exams/
    },
    {
        href: "/arena",
        label: "Đấu trường",
        icon: Swords,
        activePattern: /^\/arena/
    },
    {
        href: "/student/checklist",
        label: "Checklist",
        icon: ListTodo,
        activePattern: /^\/student\/checklist/
    },
    {
        href: "/student/profile",
        label: "Hồ sơ",
        icon: User,
        activePattern: /^\/student\/profile$/
    },
]

const teacherNavItems: NavItem[] = [
    {
        href: "/teacher/dashboard",
        label: "Trang chủ",
        icon: Home,
        activePattern: /^\/teacher\/dashboard/
    },
    {
        href: "/teacher/exams/create",
        label: "Tạo đề",
        icon: FileText,
        activePattern: /^\/teacher\/exams\/create/
    },
    {
        href: "/teacher/arena",
        label: "Đấu trường",
        icon: Swords,
        activePattern: /^\/teacher\/arena/
    },
    {
        href: "/teacher/monitor",
        label: "Giám sát",
        icon: Eye,
        activePattern: /^\/teacher\/monitor/
    },
    {
        href: "/teacher/profile",
        label: "Hồ sơ",
        icon: User,
        activePattern: /^\/teacher\/profile$/
    },
]

export function MobileNav() {
    const pathname = usePathname()

    if (!pathname) return null

    // Only show on logged-in areas (student or teacher subpaths, or arena/resources)
    const isStudentArea = pathname.startsWith("/student") || pathname.startsWith("/arena") || pathname.startsWith("/resources")
    const isTeacherArea = pathname.startsWith("/teacher")

    if (!isStudentArea && !isTeacherArea) {
        return null
    }

    // Hide during exam taking or live arena sessions
    if (pathname.includes("/take") || (pathname.includes("/arena/") && pathname !== "/arena")) {
        return null
    }

    const items = isTeacherArea ? teacherNavItems : studentNavItems

    return (
        <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {items.slice(0, 5).map((item) => {
                    const isActive = item.activePattern 
                        ? item.activePattern.test(pathname) 
                        : pathname === item.href || pathname.startsWith(item.href + "/")

                    return (
                        <Link
                            key={item.href + item.label}
                            href={item.href}
                            className={cn(
                                "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-[transform,color,background-color,box-shadow] duration-200",
                                isActive
                                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg shadow-black/10"
                                    : "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} strokeWidth={1.2} />
                            <span className={cn("transition-[font-weight,opacity] duration-200 text-[10px] font-medium", isActive && "font-semibold")}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
