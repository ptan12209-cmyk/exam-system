"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import {
    GraduationCap,
    FileText,
    LogOut,
    BookOpen,
    Swords,
    BarChart3,
    Award,
    User,
    ChevronRight
} from "lucide-react"

interface Notification {
    id: string
    title: string
    message: string | null
    type: string
    link: string | null
    is_read: boolean
    created_at: string
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [fullName, setFullName] = useState("")
    const [userClass, setUserClass] = useState("")
    const [userXp, setUserXp] = useState(0)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
            if (profile) { setFullName(profile.full_name || ""); setUserClass(profile.class || "") }
            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)
            const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
            if (!error && data) setNotifications(data)
            setLoading(false)
        }
        fetchData()
    }, [supabase, router])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }

    const timeAgo = (date: string) => {
        const diffMs = new Date().getTime() - new Date(date).getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)
        if (diffMins < 1) return "Vừa xong"
        if (diffMins < 60) return `${diffMins} phút trước`
        if (diffHours < 24) return `${diffHours} giờ trước`
        return `${diffDays} ngày trước`
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText },
    ]
    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
        { href: "/student/notifications", label: "Thông báo", icon: Bell, active: true, badge: unreadCount },
        { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
    ]

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 glass-sidebar p-5 hidden lg:flex lg:flex-col z-50">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-foreground">ExamHub</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}

                    <div className="pt-5 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Khám phá</p>
                    </div>

                    {EXPLORE_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.badge && item.badge > 0 ? (
                                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
                            ) : item.active ? <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" /> : null}
                        </Link>
                    ))}

                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3"><XpBar xp={userXp} size="sm" /></div>
                    </div>
                </nav>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                </div>
            </header>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Thông báo</h1>
                        <p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                    </div>
                </div>

                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">
                        Thông báo
                        {unreadCount > 0 && <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </h1>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Bell className="w-5 h-5 text-indigo-500" />
                            Tất cả thông báo
                        </h3>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs">
                                <Check className="w-3 h-3 mr-1" />Đánh dấu đã đọc
                            </Button>
                        )}
                    </div>
                    <div className="divide-y divide-border/30">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-7 h-7 text-muted-foreground/40" />
                                </div>
                                <p className="text-muted-foreground">Bạn chưa có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div key={notification.id}
                                    className={cn("p-4 transition-all duration-200 hover:bg-muted/30", !notification.is_read ? "bg-indigo-50/40 dark:bg-indigo-950/10" : "")}
                                >
                                    <div className="flex gap-4">
                                        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", !notification.is_read ? "bg-indigo-500" : "bg-transparent")} />
                                        <div className="flex-1">
                                            {notification.link ? (
                                                <Link href={notification.link} onClick={() => !notification.is_read && markAsRead(notification.id)} className="block group">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className={cn("text-sm font-medium mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>{notification.title}</h3>
                                                        <ExternalLink className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {notification.message && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>}
                                                </Link>
                                            ) : (
                                                <div onClick={() => !notification.is_read && markAsRead(notification.id)} className="cursor-pointer">
                                                    <h3 className={cn("text-sm font-medium mb-1", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>{notification.title}</h3>
                                                    {notification.message && <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground/60">{timeAgo(notification.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
