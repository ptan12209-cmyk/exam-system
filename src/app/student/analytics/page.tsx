"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    BarChart3,
    Loader2,
    Trophy,
    Target,
    Calendar,
    TrendingUp,
    Flame,
    Award
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
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
                // Transform the data to handle the join properly
                const transformedData = subsData.map((sub: {
                    id: string
                    exam_id: string
                    score: number
                    submitted_at: string
                    exam: { id: string; title: string; subject?: string } | { id: string; title: string; subject?: string }[] | null
                }) => ({
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-50 safe-top">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/student/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">Thống kê của tôi</h1>
                                    <p className="text-sm text-muted-foreground">Theo dõi tiến bộ học tập</p>
                                </div>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Calendar className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                            <div className="text-2xl font-bold">{summary.totalExams}</div>
                            <div className="text-xs text-muted-foreground">Bài thi</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Target className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                            <div className="text-2xl font-bold">{summary.averageScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Điểm TB</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                            <div className="text-2xl font-bold">{summary.bestScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Cao nhất</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${summary.recentTrend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                            <div className="text-2xl font-bold">
                                {summary.recentTrend >= 0 ? '+' : ''}{summary.recentTrend.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground">Xu hướng</div>
                        </CardContent>
                    </Card>
                    {stats && (
                        <>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Flame className="w-6 h-6 mx-auto text-orange-500 mb-2" />
                                    <div className="text-2xl font-bold">{stats.streak_days}</div>
                                    <div className="text-xs text-muted-foreground">Streak</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Award className="w-6 h-6 mx-auto text-pink-500 mb-2" />
                                    <div className="text-2xl font-bold">Lv.{stats.level}</div>
                                    <div className="text-xs text-muted-foreground">{stats.xp} XP</div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {submissions.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu</h3>
                            <p className="text-muted-foreground mb-4">
                                Hoàn thành một số bài thi để xem thống kê
                            </p>
                            <Link href="/student/dashboard">
                                <Button>Làm bài thi</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Progress Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
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
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        Hoạt động 6 tháng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ActivityHeatmap data={activityData} />
                                </CardContent>
                            </Card>

                            {/* Strength Radar */}
                            {strengthData.length >= 3 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Target className="w-5 h-5" />
                                            Điểm mạnh / Điểm yếu
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <StrengthRadarChart data={strengthData} />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Recent Exams */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Lịch sử làm bài
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left text-sm">
                                                <th className="px-4 py-3 font-medium">Đề thi</th>
                                                <th className="px-4 py-3 font-medium">Ngày</th>
                                                <th className="px-4 py-3 font-medium text-right">Điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {[...submissions].reverse().slice(0, 10).map((sub) => (
                                                <tr key={sub.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3">{sub.exam?.title || "Không xác định"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {new Date(sub.submitted_at).toLocaleDateString("vi-VN")}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        <span className={sub.score >= 5 ? "text-green-500" : "text-red-500"}>
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
                    </>
                )}
            </main>
        </div>
    )
}
