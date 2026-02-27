"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
    User,
    BarChart3,
    Swords,
    Gift,
    LogOut,
    Settings,
    ChevronDown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UserMenuProps {
    userName: string
    userClass?: string
    onLogout: () => void
    role?: "student" | "teacher"
}

export function UserMenu({ userName, userClass, onLogout, role = "student" }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const menuItems = role === "student" ? [
        { href: "/student/profile", icon: User, label: "Hồ sơ của tôi" },
        { href: "/student/analytics", icon: BarChart3, label: "Thống kê" },
        { href: "/arena", icon: Swords, label: "Đấu trường" },
        { href: "/student/rewards", icon: Gift, label: "Phần thưởng" },
    ] : [
        { href: "/teacher/profile", icon: User, label: "Hồ sơ của tôi" },
        { href: "/teacher/analytics", icon: BarChart3, label: "Thống kê" },
        { href: "/teacher/arena", icon: Swords, label: "Đấu trường" },
        { href: "/teacher/exam-bank", icon: Settings, label: "Ngân hàng ĐT" },
    ]

    const initials = userName
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U"

    return (
        <div ref={menuRef} className="relative">
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all duration-200",
                    "hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95",
                    isOpen && "bg-slate-100 dark:bg-slate-800/60"
                )}
            >
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
                    {initials}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-foreground leading-tight">{userName || "User"}</p>
                    <p className="text-[10px] text-muted-foreground">{userClass || (role === "student" ? "Học sinh" : "Giáo viên")}</p>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200 hidden sm:block",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 glass-card rounded-2xl shadow-xl overflow-hidden z-50 animate-scale-in">
                    {/* User Info Header */}
                    <div className="px-4 py-3.5 border-b border-slate-200/60 dark:border-slate-700/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-md shadow-indigo-500/20">
                                {initials}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground text-sm">{userName}</p>
                                <p className="text-xs text-muted-foreground">{userClass || (role === "student" ? "Học sinh" : "Giáo viên")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1.5 px-1.5">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-foreground rounded-xl transition-all duration-150 group"
                            >
                                <item.icon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-200/60 dark:border-slate-700/40 py-1.5 px-1.5">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onLogout()
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all duration-150 w-full group"
                        >
                            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
