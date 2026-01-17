"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
    const supabase = createClient()

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

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

        fetchNotifications()
    }, [supabase])

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/student/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Bell className="w-6 h-6" />
                                Thông báo
                            </h1>
                            <p className="text-slate-400 text-sm">
                                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}
                            </p>
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-blue-400 hover:text-blue-300"
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Đọc tất cả
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Đang tải...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-700/50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 hover:bg-slate-700/30 transition-colors",
                                            !notification.is_read && "bg-blue-500/5 border-l-2 border-l-blue-500"
                                        )}
                                    >
                                        {notification.link ? (
                                            <Link
                                                href={notification.link}
                                                onClick={() => {
                                                    if (!notification.is_read) markAsRead(notification.id)
                                                }}
                                                className="block"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1">
                                                        <p className={cn(
                                                            "text-sm",
                                                            notification.is_read ? "text-slate-300" : "text-white font-medium"
                                                        )}>
                                                            {notification.title}
                                                        </p>
                                                        {notification.message && (
                                                            <p className="text-sm text-slate-400 mt-1">
                                                                {notification.message}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-500 mt-2">
                                                            {timeAgo(notification.created_at)}
                                                        </p>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0 mt-1" />
                                                </div>
                                            </Link>
                                        ) : (
                                            <div
                                                onClick={() => {
                                                    if (!notification.is_read) markAsRead(notification.id)
                                                }}
                                                className="cursor-pointer"
                                            >
                                                <p className={cn(
                                                    "text-sm",
                                                    notification.is_read ? "text-slate-300" : "text-white font-medium"
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-sm text-slate-400 mt-1">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {timeAgo(notification.created_at)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
