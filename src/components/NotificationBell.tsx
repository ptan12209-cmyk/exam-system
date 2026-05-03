"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, Check, ExternalLink, X, Loader2 } from "lucide-react"
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

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
            if (!error && data) {
                setNotifications(data)
                setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
            }
            setLoading(false)
        }
        fetchNotifications()
        const channel = supabase.channel("notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: { new: Notification }) => {
            const newNotification = payload.new
            setNotifications(prev => [newNotification, ...prev.slice(0, 9)])
            setUnreadCount(prev => prev + 1)
        }).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ is_read: true }).eq("id", id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    const timeAgo = (date: string) => {
        const now = new Date(); const past = new Date(date); const diffMs = now.getTime() - past.getTime()
        const diffMins = Math.floor(diffMs / 60000); const diffHours = Math.floor(diffMins / 60); const diffDays = Math.floor(diffHours / 24)
        if (diffMins < 1) return "Vừa xong"
        if (diffMins < 60) return `${diffMins}m`
        if (diffHours < 24) return `${diffHours}h`
        return `${diffDays}d`
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-xl transition-all duration-200 hover:bg-[hsl(var(--muted))]/50 active:scale-95",
                    isOpen && "bg-[hsl(var(--muted))]/50"
                )}
            >
                <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" strokeWidth={1.5} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[hsl(var(--background))]" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-4 w-80 bg-[hsl(var(--card))]/95 backdrop-blur-2xl border border-[hsl(var(--border))]/40 rounded-[2rem] shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ease-out">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]/40">
                        <h3 className="font-bold text-sm tracking-tight">Thông báo</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]/40" /></div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell className="w-8 h-8 text-[hsl(var(--muted-foreground))]/20 mx-auto mb-3" />
                                <p className="text-[hsl(var(--muted-foreground))] text-xs">Chưa có thông báo mới</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[hsl(var(--border))]/10">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "p-4 transition-colors cursor-pointer hover:bg-[hsl(var(--muted))]/30",
                                            !notification.is_read && "bg-[hsl(var(--foreground))]/5"
                                        )}
                                        onClick={() => {
                                            if (!notification.is_read) markAsRead(notification.id)
                                            if (notification.link) setIsOpen(false)
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm tracking-tight", notification.is_read ? "text-[hsl(var(--muted-foreground))]" : "font-semibold")}>
                                                    {notification.title}
                                                </p>
                                                {notification.message && (
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2 leading-relaxed">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]/50 mt-1.5 uppercase tracking-wider">
                                                    {timeAgo(notification.created_at)}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-[hsl(var(--border))]/10">
                        <Link
                            href="/student/notifications"
                            className="flex w-full items-center justify-center rounded-xl py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50 transition-all"
                            onClick={() => setIsOpen(false)}
                        >
                            Xem tất cả
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
