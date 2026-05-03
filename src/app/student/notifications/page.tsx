"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { BottomNav } from "@/components/BottomNav"
import { Bell, Check, ExternalLink, FileText, Award, User, BarChart3 } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

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
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [userClass, setUserClass] = useState("")
  const [userXp, setUserXp] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      setUserClass(profile?.class || "")
      const { stats } = await getUserStats(user.id)
      setUserXp(stats.xp)
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      if (data) setNotifications(data)
      setLoading(false)
    })()
  }, [router, supabase])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const quickLinks = [
    { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
    { href: "/student/exams", label: "Đề thi", icon: FileText },
    { href: "/student/achievements", label: "Thành tích", icon: Award },
    { href: "/student/profile", label: "Hồ sơ", icon: User },
  ]

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

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const markAsRead = async (id: string) => { await supabase.from("notifications").update({ is_read: true }).eq("id", id); setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))) }
  const markAllAsRead = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false); setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))) }

  if (loading) return <Loading fullPage label="Đang tải thông báo..." />

  return (
    <StudentShell>
      <StudentHeader name={fullName} studentClass={userClass || undefined} onLogout={handleLogout} />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Bell className="h-4 w-4" /> Notifications
            </div>
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Thông báo</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
              Cập nhật ngắn gọn về bài thi, tiến trình và hoạt động của bạn trong hệ thống.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Chưa đọc</p>
            <div className="mt-2 text-3xl font-semibold">{unreadCount}</div>
            <div className="mt-4"><XpBar xp={userXp} size="sm" /></div>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 p-5 backdrop-blur-md transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--card))]">
              <item.icon className="mb-4 h-5 w-5" />
              <p className="text-sm font-medium">{item.label}</p>
            </Link>
          ))}
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tất cả thông báo</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Tất cả đã đọc"}</p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                <Check className="mr-1 h-3.5 w-3.5" /> Đánh dấu đã đọc
              </Button>
            )}
          </div>

          <div className="divide-y divide-[hsl(var(--border))]/40">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bell className="mb-4 h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
                <h3 className="text-lg font-medium">Chưa có thông báo</h3>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Hệ thống sẽ hiển thị cập nhật tại đây.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={cn("p-5 transition-[background-color] hover:bg-[hsl(var(--muted))]/20", !notification.is_read && "bg-[hsl(var(--muted))]/10") }>
                  <div className="flex gap-4">
                    <div className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", !notification.is_read ? "bg-[hsl(var(--foreground))]" : "bg-transparent")} />
                    <div className="min-w-0 flex-1">
                      {notification.link ? (
                        <Link href={notification.link} onClick={() => !notification.is_read && markAsRead(notification.id)} className="group block">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className={cn("text-sm font-medium transition-colors group-hover:text-[hsl(var(--foreground))]", !notification.is_read ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]")}>{notification.title}</h3>
                            <ExternalLink className="mt-0.5 h-3 w-3 text-[hsl(var(--muted-foreground))]/40 opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>
                          {notification.message && <p className="mt-1 line-clamp-2 text-sm text-[hsl(var(--muted-foreground))]">{notification.message}</p>}
                        </Link>
                      ) : (
                        <button onClick={() => !notification.is_read && markAsRead(notification.id)} className="block w-full text-left">
                          <h3 className={cn("text-sm font-medium", !notification.is_read ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]")}>{notification.title}</h3>
                          {notification.message && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{notification.message}</p>}
                        </button>
                      )}
                      <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]/60">{timeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </StudentShell>
  )
}
