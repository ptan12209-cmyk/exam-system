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

    // Close menu when clicking outside
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

    // Get initials for avatar
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
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                    "hover:bg-slate-700/50 active:scale-95",
                    isOpen && "bg-slate-700/50"
                )}
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-white leading-tight">{userName || "User"}</p>
                    <p className="text-[10px] text-slate-400">{userClass || (role === "student" ? "Học sinh" : "Giáo viên")}</p>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-slate-400 transition-transform hidden sm:block",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                        <p className="font-medium text-white">{userName}</p>
                        <p className="text-xs text-slate-400">{userClass || (role === "student" ? "Học sinh" : "Giáo viên")}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-700 py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                onLogout()
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full"
                        >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
