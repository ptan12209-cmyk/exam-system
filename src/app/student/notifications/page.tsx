"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
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

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function NotificationsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      
      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      if (data) setNotifications(data)
      
      setLoading(false)
    })()
  }, [router, supabase])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const quickLinks = [
    { href: "/student/dashboard", label: "Dashboard chính", icon: BarChart3 },
    { href: "/student/exams", label: "Đề thi & Kết quả", icon: FileText },
    { href: "/student/achievements", label: "Hộp thành tích", icon: Award },
    { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const xpProgress = useMemo(() => {
    const currentLevel = studentStats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = studentStats.xp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [studentStats.level, studentStats.xp])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải thông báo..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={studentStats.xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Header Title Section */}
        <section className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#8C87A2]">
              <Bell className="h-4 w-4 text-[#C18CFF]" /> Notifications
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Thông báo hệ thống
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
              Cập nhật ngắn gọn và kịp thời về bài thi, tiến trình học tập và hoạt động của bạn.
            </p>
          </div>

          {/* XP Summary Box */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-[#8C87A2] uppercase font-mono">THÔNG BÁO CHƯA ĐỌC</span>
              <span className="rounded bg-[#C18CFF]/15 px-2 py-0.5 text-[10px] font-bold text-[#C18CFF] font-mono">
                {unreadCount} tin
              </span>
            </div>
            <div className="text-3xl font-bold font-mono text-[#F1EDF9] mt-2">{studentStats.xp.toLocaleString()} XP</div>
            
            <div className="mt-4 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF]" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#8C87A2] font-mono">
                <span>Cấp {studentStats.level}</span>
                <span>Còn {xpProgress.nextTotal - studentStats.xp} XP lên cấp {studentStats.level + 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Grid */}
        <section className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex items-center gap-3 rounded-xl border border-[#8C87A2]/20 bg-[#15131F] p-4 hover:border-[#C18CFF]/50 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8C87A2]/20 bg-[#0B0A13] text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-[#F1EDF9]">{item.label}</span>
            </Link>
          ))}
        </section>

        {/* Notifications list box */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] shadow-sm">
          
          <div className="flex flex-col gap-4 border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#F1EDF9]">Hộp tin thông báo</h2>
              <p className="text-xs text-[#8C87A2] mt-0.5">{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Hộp thư trống hoặc tất cả đã đọc"}</p>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllAsRead} 
                className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent text-xs"
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Đánh dấu đã đọc tất cả
              </Button>
            )}
          </div>

          <div className="divide-y divide-[#8C87A2]/10 bg-[#15131F]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Bell className="mb-4 h-12 w-12 text-[#8C87A2]/20" />
                <h3 className="text-base font-bold text-[#F1EDF9]">Chưa có thông báo</h3>
                <p className="text-xs text-[#8C87A2] mt-1 max-w-[220px]">Hệ thống sẽ hiển thị cập nhật mới tại đây.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-5 transition-colors", 
                    !notification.is_read ? "bg-[#C18CFF]/5 hover:bg-[#C18CFF]/10" : "bg-transparent hover:bg-[#0B0A13]/40"
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", !notification.is_read ? "bg-[#C18CFF]" : "bg-transparent border border-[#8C87A2]/20")} />
                    <div className="min-w-0 flex-1">
                      {notification.link ? (
                        <Link href={notification.link} onClick={() => !notification.is_read && markAsRead(notification.id)} className="group block">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className={cn("text-sm font-bold transition-colors group-hover:text-[#C18CFF]", !notification.is_read ? "text-[#F1EDF9]" : "text-[#8C87A2]")}>
                              {notification.title}
                            </h3>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 text-[#8C87A2] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {notification.message && <p className="mt-1.5 text-xs text-[#8C87A2] leading-relaxed line-clamp-2">{notification.message}</p>}
                        </Link>
                      ) : (
                        <button onClick={() => !notification.is_read && markAsRead(notification.id)} className="block w-full text-left">
                          <h3 className={cn("text-sm font-bold", !notification.is_read ? "text-[#F1EDF9]" : "text-[#8C87A2]")}>
                            {notification.title}
                          </h3>
                          {notification.message && <p className="mt-1.5 text-xs text-[#8C87A2] leading-relaxed">{notification.message}</p>}
                        </button>
                      )}
                      <p className="mt-2.5 text-[10px] text-[#8C87A2] font-mono">{timeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </StudentShell>
  )
}
