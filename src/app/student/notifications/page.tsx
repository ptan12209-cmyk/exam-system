"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    User
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
            if (!user) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, class")
                .eq("id", user.id)
                .single()

            if (profile) {
                setFullName(profile.full_name || "")
                setUserClass(profile.class || "")
            }

            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })

            if (!error && data) setNotifications(data)
            setLoading(false)
        }

        fetchData()
    }, [supabase, router])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const markAsRead = async (id: string) => {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false)

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }

    const timeAgo = (date: string) => {
        const now = new Date()
        const past = new Date(date)
        const diffMs = now.getTime() - past.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return "Vừa xong"
        if (diffMins < 60) return `${diffMins} phút trước`
        if (diffHours < 24) return `${diffHours} giờ trước`
        return `${diffDays} ngày trước`
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
            {/* Sidebar - Fixed */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/student/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/student/exams"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <FileText className="w-5 h-5" />
                        Làm đề thi
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Khám phá</p>
                    </div>
                    <Link
                        href="/resources"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Thư viện tài liệu
                    </Link>
                    <Link
                        href="/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/student/achievements"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Award className="w-5 h-5" />
                        Thành tích
                    </Link>
                    <Link
                        href="/student/notifications"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <Bell className="w-5 h-5" />
                        Thông báo
                        {unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </Link>
                    <Link
                        href="/student/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <User className="w-5 h-5" />
                        Hồ sơ cá nhân
                    </Link>

                    <div className="pt-6 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tiến độ</p>
                        <div className="mt-3 px-4">
                            <XpBar xp={userXp} size="sm" />
                        </div>
                    </div>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu
                        userName={fullName}
                        userClass={userClass || undefined}
                        onLogout={handleLogout}
                        role="student"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Thông báo</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu
                            userName={fullName}
                            userClass={userClass || undefined}
                            onLogout={handleLogout}
                            role="student"
                        />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Thông báo
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                </div>

                {/* Notifications Card */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-600" />
                            Tất cả thông báo
                        </CardTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                Đánh dấu đã đọc
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-100 dark:divide-slate-800">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400">Bạn chưa có thông báo nào</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800",
                                            !notification.is_read ? "bg-blue-50/60 dark:bg-blue-900/10" : ""
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                                                !notification.is_read ? "bg-blue-500" : "bg-transparent"
                                            )} />
                                            <div className="flex-1">
                                                {notification.link ? (
                                                    <Link
                                                        href={notification.link}
                                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                                        className="block group"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <h3 className={cn(
                                                                "text-sm font-medium mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
                                                                !notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                                                            )}>
                                                                {notification.title}
                                                            </h3>
                                                            <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        {notification.message && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                                                                {notification.message}
                                                            </p>
                                                        )}
                                                    </Link>
                                                ) : (
                                                    <div
                                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        <h3 className={cn(
                                                            "text-sm font-medium mb-1",
                                                            !notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                                                        )}>
                                                            {notification.title}
                                                        </h3>
                                                        {notification.message && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                                                {notification.message}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400">
                                                    {timeAgo(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
