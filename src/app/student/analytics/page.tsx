"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
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
    Gift,
    Calendar,
    TrendingUp,
    Target
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
    const [summary, setSummary] = useState({
        totalExams: 0,
        averageScore: 0,
        bestScore: 0,
        recentTrend: 0
    })

    useEffect(() => {
        async function fetchData() {
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

            const { stats: userStats } = await getUserStats(user.id)
            setUserXp(userStats.xp)

            const { data: subsData } = await supabase
                .from("submissions")
                .select(`
                    id,
                    exam_id,
                    score,
                    submitted_at,
                    exam:exams(id, title, subject)
                `)
                .eq("student_id", user.id)
                .order("submitted_at", { ascending: true })

            if (subsData) {
                const transformedData = subsData.map((sub: any) => ({
                    ...sub,
                    exam: Array.isArray(sub.exam) ? sub.exam[0] : sub.exam
                })) as Submission[]

                setSubmissions(transformedData)

                const scores = transformedData.map(s => s.score)
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                    const best = Math.max(...scores)

                    let trend = 0
                    if (scores.length >= 10) {
                        const recent5 = scores.slice(-5)
                        const prev5 = scores.slice(-10, -5)
                        const recentAvg = recent5.reduce((a, b) => a + b, 0) / 5
                        const prevAvg = prev5.reduce((a, b) => a + b, 0) / 5
                        trend = recentAvg - prevAvg
                    }

                    setSummary({
                        totalExams: scores.length,
                        averageScore: avg,
                        bestScore: best,
                        recentTrend: trend
                    })
                }
            }

            const { data: statsData } = await supabase
                .from("student_stats")
                .select("*")
                .eq("user_id", user.id)
                .single()

            if (statsData) setStats(statsData)

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const progressData = submissions.map(s => ({
        date: s.submitted_at,
        score: s.score,
        examTitle: s.exam?.title
    }))

    const activityData = generateActivityData(submissions)
    const strengthData = calculateStrengthBySubject(
        submissions.map(s => ({
            score: s.score,
            exam: s.exam ? { subject: s.exam.subject } : undefined
        }))
    )

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
                        href="/student/analytics"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <TrendingUp className="w-5 h-5" />
                        Thống kê
                    </Link>
                    <Link
                        href="/student/achievements"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Award className="w-5 h-5" />
                        Thành tích
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Thống kê học tập</h1>
                        <p className="text-gray-500 dark:text-gray-400">Theo dõi tiến trình và phân tích điểm số</p>
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Thống kê</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Phân tích tiến trình học tập</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        label="Bài thi"
                        value={summary.totalExams}
                        icon={Calendar}
                        iconColor={STUDENT_STAT_COLORS.exams.icon}
                        iconBgColor={STUDENT_STAT_COLORS.exams.bg}
                    />
                    <StatsCard
                        label="Điểm TB"
                        value={summary.averageScore.toFixed(1)}
                        icon={Target}
                        iconColor={STUDENT_STAT_COLORS.score.icon}
                        iconBgColor={STUDENT_STAT_COLORS.score.bg}
                    />
                    <StatsCard
                        label="Xu hướng"
                        value={(summary.recentTrend >= 0 ? '+' : '') + summary.recentTrend.toFixed(1)}
                        icon={TrendingUp}
                        iconColor={summary.recentTrend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                        iconBgColor={summary.recentTrend >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}
                    />
                    {stats && (
                        <StatsCard
                            label={`Lv.${stats.level}`}
                            value={stats.xp}
                            icon={BarChart3}
                            iconColor={STUDENT_STAT_COLORS.xp.icon}
                            iconBgColor={STUDENT_STAT_COLORS.xp.bg}
                        />
                    )}
                </div>

                {submissions.length === 0 ? (
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Chưa có dữ liệu thống kê</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                Hệ thống sẽ phân tích và hiển thị biểu đồ sau khi bạn hoàn thành bài thi.
                            </p>
                            <Link href="/student/exams">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    Làm bài thi ngay
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Progress Chart */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                    Tiến bộ theo thời gian
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <ProgressLineChart data={progressData} />
                            </CardContent>
                        </Card>

                        {/* Two Column Layout */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Activity Heatmap */}
                            <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                    <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                        <Calendar className="w-5 h-5 text-green-500" />
                                        Hoạt động 6 tháng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <ActivityHeatmap data={activityData} />
                                </CardContent>
                            </Card>

                            {/* Strength Radar */}
                            {strengthData.length >= 3 && (
                                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                    <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                        <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                            <Target className="w-5 h-5 text-red-500" />
                                            Điểm mạnh / Điểm yếu
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <StrengthRadarChart data={strengthData} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Recent Exams Table */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                    <Calendar className="w-5 h-5 text-purple-500" />
                                    Lịch sử làm bài
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-6 py-4">Đề thi</th>
                                                <th className="px-6 py-4">Ngày nộp</th>
                                                <th className="px-6 py-4 text-right">Điểm số</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {[...submissions].reverse().slice(0, 10).map((sub) => (
                                                <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-gray-200">{sub.exam?.title || "Không xác định"}</div>
                                                        {sub.exam?.subject && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub.exam.subject}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(sub.submitted_at).toLocaleDateString("vi-VN", {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${sub.score >= 8 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                            sub.score >= 5 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                            }`}>
                                                            {sub.score.toFixed(1)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
