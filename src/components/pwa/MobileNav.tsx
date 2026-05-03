"use client"

import { LucideIcon, Home, FileText, Trophy, User, Swords } from "lucide-react"
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
        href: "/student/profile",
        label: "Thành tích",
        icon: Trophy,
        activePattern: /^\/student\/profile/
    },
    {
        href: "/student/profile",
        label: "Hồ sơ",
        icon: User,
        activePattern: /^\/student\/profile$/
    },
]

interface MobileNavProps {
    role?: "student" | "teacher"
}

export function MobileNav({ role = "student" }: MobileNavProps) {
    const pathname = usePathname()

    // Only show on mobile
    // Dont show on exam taking pages
    if (pathname?.includes("/take") || pathname?.includes("/arena/")) {
        return null
    }

    const items = role === "student" ? studentNavItems : studentNavItems

    return (
        <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {items.slice(0, 5).map((item) => {
                    const isActive = item.activePattern?.test(pathname || "") || pathname === item.href

                    return (
                        <Link
                            key={item.href + item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-all duration-200",
                                isActive
                                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-lg"
                                    : "bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))]"
                            )}
                        >
                            <item.icon className="h-5 w-5" strokeWidth={1.2} />
                            <span className="text-[10px] font-medium">
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
