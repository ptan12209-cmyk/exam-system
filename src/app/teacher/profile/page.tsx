"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { StatsCard } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { FileText, Users, CheckCircle, Clock, BarChart3, GraduationCap, Plus, LogOut, BookOpen, Swords, User, Edit } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

interface ProfileData {
  full_name: string | null
  email: string | null
  avatar_url?: string | null
  nickname?: string | null
  bio?: string | null
}

interface ExamStats {
  totalExams: number
  publishedExams: number
  draftExams: number
  totalSubmissions: number
}

export default function TeacherProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<ExamStats>({ totalExams: 0, publishedExams: 0, draftExams: 0, totalSubmissions: 0 })
  const [recentExams, setRecentExams] = useState<{ id: string; title: string; status: string; created_at: string }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profileData } = await supabase.from("profiles").select("full_name, avatar_url, nickname, bio").eq("id", user.id).single()
      setProfile({ full_name: profileData?.full_name || null, email: user.email || null, avatar_url: profileData?.avatar_url || null, nickname: profileData?.nickname || null, bio: profileData?.bio || null })
      const { data: exams } = await supabase
        .from("exams")
        .select("id, title, status, created_at, submissions(count)")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (exams) {
        const published = exams.filter((e: any) => e.status === "published").length
        const totalSubs = exams.reduce((sum: number, e: any) => {
          const count = Array.isArray(e.submissions) && e.submissions.length 
            ? (e.submissions[0] as unknown as { count: number }).count 
            : 0
          return sum + count
        }, 0)

        setStats({ 
          totalExams: exams.length, 
          publishedExams: published, 
          draftExams: exams.length - published, 
          totalSubmissions: totalSubs 
        })
        setRecentExams(exams.slice(0, 5).map((e: any) => ({ id: e.id, title: e.title, status: e.status, created_at: e.created_at })))
      }
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang tải hồ sơ giáo viên..." />

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2"><div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div><span className="text-lg font-bold text-foreground">ExamHub</span></div>
        <div className="flex items-center gap-2"><NotificationBell /><UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" /></div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pt-20 lg:pt-10 pb-24">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"><User className="h-3.5 w-3.5" /> Teacher Profile</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Hồ sơ giáo viên</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">Quản lý thông tin cá nhân và theo dõi hoạt động giảng dạy trong một nơi duy nhất.</p>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng đề thi</p>
            <div className="mt-2 text-3xl font-semibold">{stats.totalExams}</div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{stats.totalSubmissions} lượt nộp bài</p>
          </div>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[{ href: "/teacher/dashboard", label: "Tổng quan", icon: BarChart3 }, { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus }, { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: BookOpen }, { href: "/teacher/arena", label: "Đấu trường", icon: Swords }].map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 transition-transform hover:-translate-y-0.5">
              <item.icon className="mb-3 h-5 w-5" />
              <p className="text-sm font-medium">{item.label}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20 text-4xl font-semibold">
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name || "Avatar"} className="h-full w-full object-cover" /> : profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">{profile?.full_name || "Giáo viên"}</h2>
                  <p className="mt-1 text-[hsl(var(--muted-foreground))]">{profile?.email}</p>
                  {profile?.nickname && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">@{profile.nickname}</p>}
                  {profile?.bio && <p className="mt-3 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{profile.bio}</p>}
                </div>
                <Link href="/teacher/profile/edit"><Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa</Button></Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatsCard label="Tổng đề thi" value={stats.totalExams} icon={FileText} iconColor={STAT_COLORS.blue.icon} iconBgColor={STAT_COLORS.blue.bg} />
              <StatsCard label="Đã phát hành" value={stats.publishedExams} icon={CheckCircle} iconColor={STAT_COLORS.green.icon} iconBgColor={STAT_COLORS.green.bg} />
              <StatsCard label="Bản nháp" value={stats.draftExams} icon={Clock} iconColor={STAT_COLORS.yellow.icon} iconBgColor={STAT_COLORS.yellow.bg} />
              <StatsCard label="Lượt làm bài" value={stats.totalSubmissions} icon={Users} iconColor={STAT_COLORS.purple.icon} iconBgColor={STAT_COLORS.purple.bg} />
            </div>

            <section className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden">
              <div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5" /> Đề thi gần đây</h3></div>
              {recentExams.length > 0 ? <div className="divide-y divide-[hsl(var(--border))]/30">{recentExams.map((exam) => <Link key={exam.id} href={`/teacher/exams/${exam.id}/scores`} className="flex items-center justify-between p-4 transition-colors hover:bg-[hsl(var(--muted))]/20"><div><p className="font-medium">{exam.title}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(exam.created_at).toLocaleDateString("vi-VN")}</p></div><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", exam.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{exam.status === "published" ? "Đã phát hành" : "Bản nháp"}</span></Link>)}</div> : <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">Chưa có đề thi nào.</div>}
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
              <h3 className="mb-3 text-lg font-semibold">Trạng thái tài khoản</h3>
              <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]"><p>Giảng viên chính thức</p><p>Đang hoạt động</p><p>{profile?.email}</p></div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
              <h3 className="mb-3 text-lg font-semibold">Hành động nhanh</h3>
              <div className="space-y-2">
                <Link href="/teacher/exams/create" className="block rounded-xl border border-[hsl(var(--border))]/60 px-4 py-3 hover:bg-[hsl(var(--muted))]/20">Tạo đề thi mới</Link>
                <Link href="/teacher/exam-bank" className="block rounded-xl border border-[hsl(var(--border))]/60 px-4 py-3 hover:bg-[hsl(var(--muted))]/20">Mở ngân hàng đề</Link>
                <Link href="/teacher/analytics" className="block rounded-xl border border-[hsl(var(--border))]/60 px-4 py-3 hover:bg-[hsl(var(--muted))]/20">Xem thống kê</Link>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
