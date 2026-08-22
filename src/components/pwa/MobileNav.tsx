"use client"

import { LucideIcon, Home, FileText, User, Swords, UserPlus, CalendarDays } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { ARENA_ENABLED, TIMETABLE_ENABLED } from "@/lib/features"

interface NavItem {
    href: string
    label: string
    icon: LucideIcon
    activePattern?: RegExp
    arena?: boolean
    timetable?: boolean
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
        activePattern: /^\/arena/,
        arena: true
    },
    {
        href: "/student/timetable",
        label: "TKB",
        icon: CalendarDays,
        activePattern: /^\/student\/timetable/,
        timetable: true
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
        activePattern: /^\/teacher\/arena/,
        arena: true
    },
    {
        href: "/teacher/students",
        label: "Học sinh",
        icon: UserPlus,
        activePattern: /^\/teacher\/(students|monitor)/
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
    const supabase = useMemo(() => createClient(), [])
    const [unsubmittedCount, setUnsubmittedCount] = useState(0)

    // Only show on logged-in areas (student or teacher subpaths, or arena/resources)
    const isStudentArea =
        !!pathname &&
        (pathname.startsWith("/student") ||
            pathname.startsWith("/arena") ||
            pathname.startsWith("/resources"))
    const isTeacherArea = !!pathname?.startsWith("/teacher")

    useEffect(() => {
        let active = true
        async function getUnsubmittedCount() {
            // 60s sessionStorage cache — one RPC instead of 4 serial queries
            const CACHE_KEY = "unsubmitted-exam-count"
            try {
                const cached = sessionStorage.getItem(CACHE_KEY)
                if (cached) {
                    const { count, ts } = JSON.parse(cached) as { count: number; ts: number }
                    if (Date.now() - ts < 60_000) {
                        setUnsubmittedCount(count)
                        return
                    }
                }

                const { data: count } = await supabase.rpc("get_unsubmitted_exam_count")
                if (!active) return
                setUnsubmittedCount(count ?? 0)
                sessionStorage.setItem(CACHE_KEY, JSON.stringify({ count: count ?? 0, ts: Date.now() }))
            } catch (error) {
                console.error("Error fetching unsubmitted count:", error)
            }
        }

        if (isStudentArea) {
            getUnsubmittedCount()
        }

        return () => {
            active = false
        }
    }, [isStudentArea, supabase])

    if (!pathname) return null

    if (!isStudentArea && !isTeacherArea) {
        return null
    }

    // Hide during exam taking or live arena sessions
    if (pathname.includes("/take") || (pathname.includes("/arena/") && pathname !== "/arena")) {
        return null
    }

    const items = (isTeacherArea ? teacherNavItems : studentNavItems).filter((item) => {
        if (item.arena && !ARENA_ENABLED) return false
        if (item.timetable && !TIMETABLE_ENABLED) return false
        return true
    })

    return (
        <nav className="glass-nav-bottom fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-[72px] px-2 pb-1">
                {items.slice(0, 5).map((item) => {
                    const isActive = item.activePattern 
                        ? item.activePattern.test(pathname) 
                        : pathname === item.href || pathname.startsWith(item.href + "/")

                    const isDeThi = item.label === "Đề thi"
                    const hasBadge = isDeThi && unsubmittedCount > 0

                    return (
                        <Link
                            key={item.href + item.label}
                            href={item.href}
                            className={cn(
                                "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] tracking-wide font-medium transition-all duration-300 ease-out",
                                isActive
                                    ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                                    : "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/30 hover:text-[hsl(var(--foreground))]"
                            )}
                        >
                            <div className="relative">
                                <item.icon className={cn("h-[22px] w-[22px] transition-transform duration-300", isActive && "scale-110")} strokeWidth={1.5} />
                                {hasBadge && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                            <span className={cn("transition-all duration-300 text-[11px]", isActive ? "font-semibold" : "font-medium")}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

