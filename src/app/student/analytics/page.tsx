"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import { cn } from "@/lib/utils"
import {
    GraduationCap,
    FileText,
    LogOut,
    Loader2,
    BookOpen,
    Swords,
    BarChart3,
    Award,
    User,
    Calendar,
    TrendingUp,
    Target,
    ChevronRight
} from "lucide-react"
import { ProgressLineChart } from "@/components/analytics/ProgressLineChart"
import { ActivityHeatmap, generateActivityData } from "@/components/analytics/ActivityHeatmap"
import { StrengthRadarChart, calculateStrengthBySubject } from "@/components/analytics/StrengthRadarChart"
import { StatsCard } from "@/components/shared"
import { STUDENT_STAT_COLORS } from "@/lib/student-styles"

interface Submission {
    id: string
    exam_id: string
    score: number
    submitted_at: string
    exam: {
        id: string
        title: string
        subject?: string
    } | null
}

interface StudentStats {
    xp: number
    level: number
    streak_days: number
    exams_completed: number
    perfect_scores: number
}

export default function StudentAnalyticsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [fullName, setFullName] = useState("")
    const [userClass, setUserClass] = useState("")
    const [userXp, setUserXp] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [stats, setStats] = useState<StudentStats | null>(null)
    const [summary, setSummary] = useState({ totalExams: 0, averageScore: 0, bestScore: 0, recentTrend: 0 })

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
            if (profile) { setFullName(profile.full_name || ""); setUserClass(profile.class || "") }
            const { stats: userStats } = await getUserStats(user.id)
            setUserXp(userStats.xp)

            const { data: subsData } = await supabase.from("submissions").select(`id, exam_id, score, submitted_at, exam:exams(id, title, subject)`).eq("student_id", user.id).order("submitted_at", { ascending: true })
            if (subsData) {
                const transformedData = subsData.map((sub: { id: string, exam_id: string, score: number, submitted_at: string, exam: { id: string, title: string, subject: string | null } | { id: string, title: string, subject: string | null }[] | null }) => ({
                    ...sub, exam: Array.isArray(sub.exam) ? sub.exam[0] : sub.exam
                })) as Submission[]
                setSubmissions(transformedData)
                const scores = transformedData.map(s => s.score)
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                    let trend = 0
                    if (scores.length >= 10) {
                        const recent5 = scores.slice(-5); const prev5 = scores.slice(-10, -5)
                        trend = recent5.reduce((a, b) => a + b, 0) / 5 - prev5.reduce((a, b) => a + b, 0) / 5
                    }
                    setSummary({ totalExams: scores.length, averageScore: avg, bestScore: Math.max(...scores), recentTrend: trend })
                }
            }
            const { data: statsData } = await supabase.from("student_stats").select("*").eq("user_id", user.id).single()
            if (statsData) setStats(statsData)
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText },
    ]
    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/analytics", label: "Thống kê", icon: TrendingUp, active: true },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
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

    const progressData = submissions.map(s => ({ date: s.submitted_at, score: s.score, examTitle: s.exam?.title }))
    const activityData = generateActivityData(submissions)
    const strengthData = calculateStrengthBySubject(submissions.map(s => ({ score: s.score, exam: s.exam ? { subject: s.exam.subject } : undefined })))

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
                        <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group">
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" /><span className="text-sm">{item.label}</span>
                        </Link>
                    ))}
                    <div className="pt-5 pb-2"><p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Khám phá</p></div>
                    {EXPLORE_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}>
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}
                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3"><XpBar xp={userXp} size="sm" /></div>
                    </div>
                </nav>
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div>
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
                        <h1 className="text-2xl font-bold text-foreground">Thống kê học tập</h1>
                        <p className="text-muted-foreground">Theo dõi tiến trình và phân tích điểm số</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                    </div>
                </div>

                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">Thống kê</h1>
                    <p className="text-muted-foreground text-sm">Phân tích tiến trình học tập</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard label="Bài thi" value={summary.totalExams} icon={Calendar} iconColor={STUDENT_STAT_COLORS.exams.icon} iconBgColor={STUDENT_STAT_COLORS.exams.bg} />
                    <StatsCard label="Điểm TB" value={summary.averageScore.toFixed(1)} icon={Target} iconColor={STUDENT_STAT_COLORS.score.icon} iconBgColor={STUDENT_STAT_COLORS.score.bg} />
                    <StatsCard label="Xu hướng" value={(summary.recentTrend >= 0 ? '+' : '') + summary.recentTrend.toFixed(1)} icon={TrendingUp}
                        iconColor={summary.recentTrend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                        iconBgColor={summary.recentTrend >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"} />
                    {stats && <StatsCard label={`Lv.${stats.level}`} value={stats.xp} icon={BarChart3} iconColor={STUDENT_STAT_COLORS.xp.icon} iconBgColor={STUDENT_STAT_COLORS.xp.bg} />}
                </div>

                {submissions.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Chưa có dữ liệu thống kê</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">Hệ thống sẽ phân tích và hiển thị biểu đồ sau khi bạn hoàn thành bài thi.</p>
                        <Link href="/student/exams">
                            <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">Làm bài thi ngay</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Progress Chart */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="flex items-center gap-2 text-foreground font-bold"><TrendingUp className="w-5 h-5 text-indigo-500" />Tiến bộ theo thời gian</h3>
                            </div>
                            <div className="p-5"><ProgressLineChart data={progressData} /></div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="p-5 border-b border-border/50">
                                    <h3 className="flex items-center gap-2 text-foreground font-bold"><Calendar className="w-5 h-5 text-emerald-500" />Hoạt động 6 tháng</h3>
                                </div>
                                <div className="p-5"><ActivityHeatmap data={activityData} /></div>
                            </div>
                            {strengthData.length >= 3 && (
                                <div className="glass-card rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-border/50">
                                        <h3 className="flex items-center gap-2 text-foreground font-bold"><Target className="w-5 h-5 text-rose-500" />Điểm mạnh / Điểm yếu</h3>
                                    </div>
                                    <div className="p-5"><StrengthRadarChart data={strengthData} /></div>
                                </div>
                            )}
                        </div>

                        {/* History Table */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="flex items-center gap-2 text-foreground font-bold"><Calendar className="w-5 h-5 text-violet-500" />Lịch sử làm bài</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/30">
                                        <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            <th className="px-6 py-4">Đề thi</th>
                                            <th className="px-6 py-4">Ngày nộp</th>
                                            <th className="px-6 py-4 text-right">Điểm số</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {[...submissions].reverse().slice(0, 10).map((sub) => (
                                            <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{sub.exam?.title || "Không xác định"}</div>
                                                    {sub.exam?.subject && <div className="text-xs text-muted-foreground mt-1">{sub.exam.subject}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(sub.submitted_at).toLocaleDateString("vi-VN", { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={cn("inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold",
                                                        sub.score >= 8 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                            sub.score >= 5 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    )}>{sub.score.toFixed(1)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    )
}
