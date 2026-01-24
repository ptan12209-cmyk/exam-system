"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"

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
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) setFullName(profile.full_name || "")

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })

            if (!error && data) {
                setNotifications(data)
            }
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
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                    </div>
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link href="/student/dashboard" className="p-3 text-gray-500 hover:text-blue-600 rounded-lg">🏠</Link>
                        <Link href="/student/exams" className="p-3 text-gray-500 hover:text-blue-600 rounded-lg">📝</Link>
                        <Link href="/arena" className="p-3 text-gray-500 hover:text-blue-600 rounded-lg">🏆</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow max-w-3xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/student/dashboard" className="hover:text-blue-600">Trang chủ</Link>
                    <span>›</span>
                    <span className="font-medium text-gray-800">Thông báo</span>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-600" />
                            Tất cả thông báo
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h1>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                            >
                                <Check className="w-3 h-3 mr-1" />
                                Đánh dấu đã đọc
                            </Button>
                        )}
                    </div>

                    <div className="divide-y divide-gray-100">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">Bạn chưa có thông báo nào</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 transition-colors hover:bg-gray-50",
                                        !notification.is_read ? "bg-blue-50/60" : "bg-white"
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
                                                            "text-sm font-medium mb-1 group-hover:text-blue-600 transition-colors",
                                                            !notification.is_read ? "text-gray-900" : "text-gray-600"
                                                        )}>
                                                            {notification.title}
                                                        </h3>
                                                        <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    {notification.message && (
                                                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">
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
                                                        !notification.is_read ? "text-gray-900" : "text-gray-600"
                                                    )}>
                                                        {notification.title}
                                                    </h3>
                                                    {notification.message && (
                                                        <p className="text-sm text-gray-500 mb-2">
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
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm text-blue-200">© 2026 ExamHub. All rights reserved.</p>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
