"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, Trophy, User, Swords } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    activePattern?: RegExp
}

const studentNavItems: NavItem[] = [
    {
        href: "/student/dashboard",
        label: "Trang chủ",
        icon: <Home className="w-5 h-5" />,
        activePattern: /^\/student\/dashboard/
    },
    {
        href: "/student/exams",
        label: "Đề thi",
        icon: <FileText className="w-5 h-5" />,
        activePattern: /^\/student\/exams/
    },
    {
        href: "/arena",
        label: "Đấu trường",
        icon: <Swords className="w-5 h-5" />,
        activePattern: /^\/arena/
    },
    {
        href: "/student/profile",
        label: "Thành tích",
        icon: <Trophy className="w-5 h-5" />,
        activePattern: /^\/student\/profile/
    },
    {
        href: "/student/profile",
        label: "Hồ sơ",
        icon: <User className="w-5 h-5" />,
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {items.slice(0, 5).map((item) => {
                    const isActive = item.activePattern?.test(pathname || "") || pathname === item.href

                    return (
                        <Link
                            key={item.href + item.label}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px]",
                                isActive
                                    ? "text-blue-400 bg-blue-500/10"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            {item.icon}
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

// CSS for safe area (add to globals.css if needed)
// .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
