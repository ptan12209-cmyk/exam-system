"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Notification {
    id: string
    title: string
    message: string | null
    type: string
    link: string | null
    is_read: boolean
    created_at: string
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(10)

            if (!error && data) {
                setNotifications(data)
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
            }
            setLoading(false)
        }

        fetchNotifications()

        // Subscribe to realtime changes
        const channel = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications"
                },
                (payload: { new: Notification }) => {
                    const newNotification = payload.new
                    setNotifications(prev => [newNotification, ...prev.slice(0, 9)])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Mark as read
    const markAsRead = async (id: string) => {
        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Mark all as read
    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false)

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    // Format time ago
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                        <h3 className="font-semibold text-white">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-400">
                                Đang tải...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">Chưa có thông báo</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer",
                                        !notification.is_read && "bg-blue-500/5 border-l-2 border-l-blue-500"
                                    )}
                                    onClick={() => {
                                        if (!notification.is_read) markAsRead(notification.id)
                                        if (notification.link) {
                                            setIsOpen(false)
                                        }
                                    }}
                                >
                                    {notification.link ? (
                                        <Link href={notification.link} className="block">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1">
                                                    <p className={cn(
                                                        "text-sm",
                                                        notification.is_read ? "text-slate-300" : "text-white font-medium"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    {notification.message && (
                                                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {timeAgo(notification.created_at)}
                                                    </p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            </div>
                                        </Link>
                                    ) : (
                                        <div>
                                            <p className={cn(
                                                "text-sm",
                                                notification.is_read ? "text-slate-300" : "text-white font-medium"
                                            )}>
                                                {notification.title}
                                            </p>
                                            {notification.message && (
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-500 mt-1">
                                                {timeAgo(notification.created_at)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-700">
                            <Link
                                href="/student/notifications"
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
                                onClick={() => setIsOpen(false)}
                            >
                                Xem tất cả thông báo
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
