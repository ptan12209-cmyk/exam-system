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
import {
    Loader2,
    Calendar,
    TrendingUp,
    Target,
    BarChart3
} from "lucide-react"
import { ProgressLineChart } from "@/components/analytics/ProgressLineChart"
import { ActivityHeatmap, generateActivityData } from "@/components/analytics/ActivityHeatmap"
import { StrengthRadarChart, calculateStrengthBySubject } from "@/components/analytics/StrengthRadarChart"

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
    const [loading, setLoading] = useState(true)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [stats, setStats] = useState<StudentStats | null>(null)
    const [summary, setSummary] = useState({
        totalExams: 0,
        averageScore: 0,
        bestScore: 0,
        recentTrend: 0 // positive = improving
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
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) setFullName(profile.full_name || "")

            // Fetch submissions with exam details
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

                // Calculate summary
                const scores = transformedData.map(s => s.score)
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                    const best = Math.max(...scores)

                    // Calculate trend (last 5 vs previous 5)
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

            // Fetch gamification stats
            const { data: statsData } = await supabase
                .from("student_stats")
                .select("*")
                .eq("user_id", user.id)
                .single()

            if (statsData) {
                setStats(statsData)
            }

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
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Prepare data for charts
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
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                    </div>
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link href="/student/dashboard" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏠</Link>
                        <Link href="/student/exams" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">📝</Link>
                        <Link href="/arena" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏆</Link>
                        <Link href="/student/analytics" className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg">📊</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <Link href="/student/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Trang chủ</Link>
                    <span>›</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Thống kê học tập</span>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 text-center">
                        <Calendar className="w-6 h-6 mx-auto text-blue-500 dark:text-blue-400 mb-2" />
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">{summary.totalExams}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Bài thi</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 text-center">
                        <Target className="w-6 h-6 mx-auto text-purple-500 dark:text-purple-400 mb-2" />
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">{summary.averageScore.toFixed(1)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Điểm TB</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 text-center">
                        <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${summary.recentTrend >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
                        <div className="text-2xl font-bold text-gray-800 dark:text-white">
                            {summary.recentTrend >= 0 ? '+' : ''}{summary.recentTrend.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Xu hướng</div>
                    </div>
                    {stats && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 text-center">
                            <div className="w-6 h-6 mx-auto text-orange-500 dark:text-orange-400 mb-2 font-bold flex items-center justify-center">XP</div>
                            <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.xp}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Lv.{stats.level}</div>
                        </div>
                    )}
                </div>

                {submissions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center">
                        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Chưa có dữ liệu thống kê</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            Hệ thống sẽ tự động phân tích và hiển thị biểu đồ sau khi bạn hoàn thành bài thi đầu tiên.
                        </p>
                        <Link href="/student/exams">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                Làm bài thi ngay
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Progress Chart */}
                        <Card className="bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                    <TrendingUp className="w-5 h-5 text-blue-500" />
                                    Tiến bộ theo thời gian
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProgressLineChart data={progressData} />
                            </CardContent>
                        </Card>

                        {/* Two Column Layout */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Activity Heatmap */}
                            <Card className="bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                        <Calendar className="w-5 h-5 text-green-500" />
                                        Hoạt động 6 tháng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ActivityHeatmap data={activityData} />
                                </CardContent>
                            </Card>

                            {/* Strength Radar */}
                            {strengthData.length >= 3 && (
                                <Card className="bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                            <Target className="w-5 h-5 text-red-500" />
                                            Điểm mạnh / Điểm yếu
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <StrengthRadarChart data={strengthData} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Recent Exams Table */}
                        <Card className="bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-white">
                                    <Calendar className="w-5 h-5 text-purple-500" />
                                    Lịch sử làm bài
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                                            <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-6 py-4">Đề thi</th>
                                                <th className="px-6 py-4">Ngày nộp</th>
                                                <th className="px-6 py-4 text-right">Điểm số</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {[...submissions].reverse().slice(0, 10).map((sub) => (
                                                <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-900 dark:text-gray-200">{sub.exam?.title || "Không xác định"}</div>
                                                        {sub.exam?.subject && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub.exam.subject}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(sub.submitted_at).toLocaleDateString("vi-VN", {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${sub.score >= 8 ? 'bg-green-100 text-green-700' :
                                                            sub.score >= 5 ? 'bg-blue-100 text-blue-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {sub.score.toFixed(2)}
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

            {/* Footer */}
            <footer className="bg-blue-600 dark:bg-blue-900 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm text-blue-200 dark:text-blue-300">© 2026 ExamHub. All rights reserved.</p>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
