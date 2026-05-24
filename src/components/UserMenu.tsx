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
import { createClient } from "@/lib/supabase/client"
import { TitleBadge } from "@/components/gamification/TitleSelector"

interface UserMenuProps {
    userName: string
    userClass?: string
    onLogout: () => void
    role?: "student" | "teacher"
}

export function UserMenu({ userName, userClass, onLogout, role = "student" }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const [equippedTitle, setEquippedTitle] = useState<{ display_text: string; color: string } | null>(null)

    useEffect(() => {
        if (role !== "student") return
        
        const fetchEquippedTitle = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            const { data: profile } = await supabase
                .from("profiles")
                .select("equipped_title:titles(display_text, color)")
                .eq("id", user.id)
                .single()
            
            if (profile?.equipped_title) {
                setEquippedTitle(profile.equipped_title as any)
            }
        }
        
        fetchEquippedTitle()
    }, [role])

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
                    "hover:bg-[hsl(var(--muted))]/40 active:scale-95",
                    isOpen && "bg-[hsl(var(--muted))]/40"
                )}
            >
                <div className="w-8 h-8 rounded-full bg-[hsl(var(--foreground))] flex items-center justify-center text-[hsl(var(--background))] text-xs font-bold shadow-lg shadow-black/5">
                    {initials}
                </div>
                <div className="hidden sm:block text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-foreground leading-tight">{userName || "User"}</p>
                        {equippedTitle && <TitleBadge title={equippedTitle} />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{userClass || (role === "student" ? "Học sinh" : "Giáo viên")}</p>
                </div>
                <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200 hidden sm:block",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-4 w-64 bg-[hsl(var(--card))]/95 backdrop-blur-2xl border border-[hsl(var(--border))]/40 rounded-[2rem] shadow-2xl z-[150] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ease-out">
                    {/* User Info Header */}
                    <div className="px-4 py-4 border-b border-[hsl(var(--border))]/40">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[hsl(var(--foreground))] flex items-center justify-center text-[hsl(var(--background))] text-sm font-bold">
                                {initials}
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-semibold text-foreground text-sm">{userName}</p>
                                    {equippedTitle && <TitleBadge title={equippedTitle} />}
                                </div>
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
                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/40 hover:text-[hsl(var(--foreground))] rounded-xl transition-all duration-150 group"
                            >
                                <item.icon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-[hsl(var(--border))]/40 py-1.5 px-1.5">
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
