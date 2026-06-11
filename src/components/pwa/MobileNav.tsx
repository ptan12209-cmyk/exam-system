"use client"

import { LucideIcon, Home, FileText, User, Swords, Eye, CalendarDays } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"

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
        href: "/student/timetable",
        label: "TKB",
        icon: CalendarDays,
        activePattern: /^\/student\/timetable/
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
    const supabase = useMemo(() => createClient(), [])
    const [unsubmittedCount, setUnsubmittedCount] = useState(0)

    if (!pathname) return null

    // Only show on logged-in areas (student or teacher subpaths, or arena/resources)
    const isStudentArea = pathname.startsWith("/student") || pathname.startsWith("/arena") || pathname.startsWith("/resources")
    const isTeacherArea = pathname.startsWith("/teacher")

    useEffect(() => {
        let active = true
        async function getUnsubmittedCount() {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser()
                if (!authUser || !active) return

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("grade, class_suffix, nickname")
                    .eq("id", authUser.id)
                    .single()

                if (!active) return

                const isStudentX = profile?.nickname === "X"
                let examsQuery = supabase
                    .from("exams")
                    .select("id, target_grade, target_classes")
                    .eq("status", "published")
                    .eq("assigned_to", isStudentX ? "x" : "normal")

                if (profile && profile.grade !== null) {
                    examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profile.grade}`)
                }

                const { data: examsData } = await examsQuery

                if (!active || !examsData) return

                const studentClassSuffix = profile?.class_suffix?.toUpperCase()
                const visibleExams = examsData.filter((exam: any) => {
                    if (exam.target_classes && exam.target_classes.length > 0) {
                        return studentClassSuffix && exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix)
                    }
                    return true
                })

                const { data: subsData } = await supabase
                    .from("submissions")
                    .select("exam_id")
                    .eq("student_id", authUser.id)

                if (!active || !subsData) return

                const submittedIds = new Set(subsData.map((s: any) => s.exam_id))
                const unsubmitted = visibleExams.filter((exam: any) => !submittedIds.has(exam.id))
                setUnsubmittedCount(unsubmitted.length)
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

    if (!isStudentArea && !isTeacherArea) {
        return null
    }

    // Hide during exam taking or live arena sessions
    if (pathname.includes("/take") || (pathname.includes("/arena/") && pathname !== "/arena")) {
        return null
    }

    const items = isTeacherArea ? teacherNavItems : studentNavItems

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

