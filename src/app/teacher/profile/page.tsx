"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    FileText,
    Users,
    CheckCircle,
    Clock,
    BarChart3,
    Loader2,
    GraduationCap,
    Plus,
    LogOut,
    BookOpen,
    Swords,
    User,
    Edit,
    ChevronRight
} from "lucide-react"
import { StatsCard } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"

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
            setProfile({
                full_name: profileData?.full_name || null,
                email: user.email || null,
                avatar_url: profileData?.avatar_url || null,
                nickname: profileData?.nickname || null,
                bio: profileData?.bio || null
            })

            const { data: exams } = await supabase.from("exams").select("id, title, status, created_at").eq("teacher_id", user.id).order("created_at", { ascending: false })
            if (exams) {
                const published = exams.filter((e: { status: string }) => e.status === "published").length
                setStats({ totalExams: exams.length, publishedExams: published, draftExams: exams.length - published, totalSubmissions: 0 })
                setRecentExams(exams.slice(0, 5))

                let totalSubs = 0
                for (const exam of exams) {
                    const { count } = await supabase.from("submissions").select("*", { count: "exact", head: true }).eq("exam_id", exam.id)
                    totalSubs += count || 0
                }
                setStats(prev => ({ ...prev, totalSubmissions: totalSubs }))
            }
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    const NAV_ITEMS = [
        { href: "/teacher/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus },
    ]
    const MANAGE_ITEMS = [
        { href: "/teacher/profile", label: "Hồ sơ giáo viên", icon: User, active: true },
        { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: BookOpen },
        { href: "/teacher/arena", label: "Đấu trường", icon: Swords },
        { href: "/teacher/analytics", label: "Thống kê chi tiết", icon: BarChart3 },
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
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản lý</p>
                    </div>

                    {MANAGE_ITEMS.map((item) => (
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
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}
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
                    <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Hồ sơ giáo viên</h1>
                        <p className="text-muted-foreground">Thông tin cá nhân và thống kê</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>

                {/* Profile Header Card */}
                <div className="glass-card rounded-2xl mb-6 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-24 gradient-primary" />
                    <div className="relative z-10 px-6 pb-6">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-0 pt-10">
                            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-slate-800 gradient-primary flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-indigo-500/25 overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name || "Avatar"} className="w-full h-full object-cover" />
                                ) : (
                                    profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left mb-4">
                                <h2 className="text-2xl font-bold text-foreground mb-1">
                                    {profile?.full_name || "Giáo viên"}
                                </h2>
                                <p className="text-muted-foreground text-sm mb-2">{profile?.email}</p>
                                <div className="inline-flex items-center gap-2 px-3 py-1 gradient-primary-soft text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-semibold">
                                    <Users className="w-3 h-3" />
                                    Giảng viên chính thức
                                </div>
                            </div>

                            <div className="mb-6 md:pr-2">
                                <Link href="/teacher/profile/edit">
                                    <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Chỉnh sửa
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard label="Tổng đề thi" value={stats.totalExams} icon={FileText} iconColor={STAT_COLORS.blue.icon} iconBgColor={STAT_COLORS.blue.bg} />
                    <StatsCard label="Đã phát hành" value={stats.publishedExams} icon={CheckCircle} iconColor={STAT_COLORS.green.icon} iconBgColor={STAT_COLORS.green.bg} />
                    <StatsCard label="Bản nháp" value={stats.draftExams} icon={Clock} iconColor={STAT_COLORS.yellow.icon} iconBgColor={STAT_COLORS.yellow.bg} />
                    <StatsCard label="Lượt làm bài" value={stats.totalSubmissions} icon={Users} iconColor={STAT_COLORS.purple.icon} iconBgColor={STAT_COLORS.purple.bg} />
                </div>

                {/* Recent Exams */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <h3 className="text-foreground flex items-center gap-2 text-base font-bold">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Đề thi gần đây
                        </h3>
                    </div>
                    {recentExams.length > 0 ? (
                        <div className="divide-y divide-border/30">
                            {recentExams.map((exam) => (
                                <Link key={exam.id} href={`/teacher/exams/${exam.id}/scores`}
                                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            exam.status === "published"
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                                : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                        )}>
                                            {exam.status === "published" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{exam.title}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(exam.created_at).toLocaleDateString("vi-VN")}</p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                                        exam.status === "published"
                                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    )}>
                                        {exam.status === "published" ? "Đã phát hành" : "Bản nháp"}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-4">
                            <div className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                            <p className="text-muted-foreground mb-4">Chưa có đề thi nào.</p>
                            <Link href="/teacher/exams/create">
                                <Button variant="outline" size="sm">Tạo đề đầu tiên</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            <TeacherBottomNav />
        </div>
    )
}
