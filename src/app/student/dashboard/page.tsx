"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    GraduationCap,
    FileText,
    Trophy,
    Clock,
    LogOut,
    Loader2,
    PlayCircle,
    CheckCircle2,
    ArrowRight,
    Swords,
    BarChart3,
    Gift
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { XpBar } from "@/components/gamification/XpBar"
import { ChallengesWidget } from "@/components/gamification/ChallengeCard"
import { LeaderboardCard } from "@/components/gamification/Leaderboard"
import { getUserStats } from "@/lib/gamification"

interface Profile {
    id: string
    role: string
    full_name: string | null
    class: string | null
}

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    status: "draft" | "published"
    created_at: string
}

interface Submission {
    id: string
    exam_id: string
    score: number
    submitted_at: string
    exam?: Exam
}

export default function StudentDashboard() {
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [availableExams, setAvailableExams] = useState<Exam[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [userXp, setUserXp] = useState(0)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            // Get profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            if (!profileData || profileData.role !== "student") {
                router.push("/teacher/dashboard")
                return
            }

            setProfile(profileData)
            setUserId(user.id)

            // Get gamification stats
            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)

            // Get available exams (published)
            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false })

            if (examsData) {
                setAvailableExams(examsData)
            }

            // Get student's submissions
            const { data: submissionsData } = await supabase
                .from("submissions")
                .select("*, exam:exams(*)")
                .eq("student_id", user.id)
                .order("submitted_at", { ascending: false })

            if (submissionsData) {
                setSubmissions(submissionsData)
            }

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    // Check if student already submitted this exam
    const hasSubmitted = (examId: string) => {
        return submissions.some(s => s.exam_id === examId)
    }

    const getSubmission = (examId: string) => {
        return submissions.find(s => s.exam_id === examId)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">ExamHub</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/student/profile" className="text-right hidden sm:block hover:opacity-80 transition-opacity">
                                <p className="text-sm font-medium text-white">{profile?.full_name}</p>
                                <p className="text-xs text-slate-400">{profile?.class || "Học sinh"}</p>
                            </Link>
                            <NotificationBell />
                            <Link href="/student/profile">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-white"
                                    title="Hồ sơ"
                                >
                                    <Trophy className="w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/arena">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-purple-400 hover:text-purple-300"
                                    title="Đấu trường Lý thuyết"
                                >
                                    <Swords className="w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/student/analytics">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-400 hover:text-green-300"
                                    title="Thống kê của tôi"
                                >
                                    <BarChart3 className="w-5 h-5" />
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-slate-400 hover:text-white"
                                title="Đăng xuất"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome + XP Bar */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">
                                Xin chào, {profile?.full_name || "Học sinh"}!
                            </h1>
                            <p className="text-slate-400 mt-1">
                                Chọn một đề thi để bắt đầu làm bài
                            </p>
                        </div>
                        <div className="md:w-72">
                            <XpBar xp={userXp} size="md" />
                        </div>
                    </div>
                </div>

                {/* Main Grid: Content + Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content (2/3) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            <Card className="border-slate-700 bg-slate-800/50">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-sm">Đề thi có sẵn</p>
                                        <p className="text-2xl font-bold text-white">{availableExams.length}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-700 bg-slate-800/50">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-sm">Đã hoàn thành</p>
                                        <p className="text-2xl font-bold text-white">{submissions.length}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-700 bg-slate-800/50">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                        <Trophy className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-sm">Điểm cao nhất</p>
                                        <p className="text-2xl font-bold text-white">
                                            {submissions.length > 0
                                                ? Math.max(...submissions.map(s => s.score)).toFixed(1)
                                                : "--"
                                            }
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Quick Links - Kho tài liệu & Phòng Live */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <Link href="/resources">
                                <Card className="border-slate-700 bg-gradient-to-br from-purple-900/50 to-pink-900/50 hover:border-purple-500 transition-all cursor-pointer">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                            📚
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white">Kho Tài Liệu & Đề</p>
                                            <p className="text-slate-400 text-sm">Xem tài liệu, đề thi thử</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/live">
                                <Card className="border-slate-700 bg-gradient-to-br from-green-900/50 to-emerald-900/50 hover:border-green-500 transition-all cursor-pointer">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl">
                                            📺
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white">Phòng Live Chữa Đề</p>
                                            <p className="text-slate-400 text-sm">Tham gia Google Meet</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>

                        {/* Available Exams */}
                        <Card className="border-slate-700 bg-slate-800/50 mb-8">
                            <CardHeader>
                                <CardTitle className="text-white">Đề thi có sẵn</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Chọn một đề thi để bắt đầu làm bài
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {availableExams.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400">Chưa có đề thi nào</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {availableExams.map((exam) => {
                                            const submitted = hasSubmitted(exam.id)
                                            const submission = getSubmission(exam.id)

                                            return (
                                                <div
                                                    key={exam.id}
                                                    className={cn(
                                                        "p-4 rounded-lg border transition-all",
                                                        submitted
                                                            ? "bg-slate-700/20 border-slate-700"
                                                            : "bg-slate-700/30 border-slate-700 hover:border-blue-500/50"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                                            submitted
                                                                ? "bg-green-500/10 text-green-400"
                                                                : "bg-blue-500/10 text-blue-400"
                                                        )}>
                                                            {submitted ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                        </div>
                                                        {submitted && (
                                                            <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                                                                Đã làm
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="font-semibold text-white mb-2">{exam.title}</h3>

                                                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {exam.duration} phút
                                                        </span>
                                                        <span>{exam.total_questions} câu</span>
                                                    </div>

                                                    {submitted ? (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-slate-400">
                                                                Điểm: <span className="font-bold text-white">{submission?.score.toFixed(1)}</span>
                                                            </span>
                                                            <Link href={`/student/exams/${exam.id}/result`}>
                                                                <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                                                                    Xem kết quả
                                                                    <ArrowRight className="w-4 h-4 ml-1" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <Link href={`/student/exams/${exam.id}/take`}>
                                                            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                                                <PlayCircle className="w-4 h-4 mr-2" />
                                                                Bắt đầu làm bài
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Submissions */}
                        {submissions.length > 0 && (
                            <Card className="border-slate-700 bg-slate-800/50">
                                <CardHeader>
                                    <CardTitle className="text-white">Bài thi gần đây</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Lịch sử các bài thi bạn đã làm
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {submissions.slice(0, 5).map((submission) => (
                                            <div
                                                key={submission.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-700"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{submission.exam?.title || "Đề thi"}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {new Date(submission.submitted_at).toLocaleString("vi-VN")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={cn(
                                                        "text-lg font-bold",
                                                        submission.score >= 8 ? "text-green-400" :
                                                            submission.score >= 5 ? "text-yellow-400" : "text-red-400"
                                                    )}>
                                                        {submission.score.toFixed(1)}
                                                    </p>
                                                    <p className="text-xs text-slate-400">điểm</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar (1/3) - Gamification */}
                    <div className="space-y-6">
                        {/* Challenges Widget */}
                        <Card className="border-slate-700 bg-slate-800/50">
                            <CardContent className="p-6">
                                <ChallengesWidget limit={3} />
                            </CardContent>
                        </Card>

                        {/* Leaderboard */}
                        <LeaderboardCard currentUserId={userId || undefined} />

                        {/* Rewards Shop Link */}
                        <Link href="/student/profile#rewards">
                            <Card className="border-slate-700 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 hover:border-yellow-500/50 transition-all cursor-pointer">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                        <Gift className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">Cửa hàng phần thưởng</p>
                                        <p className="text-sm text-slate-400">Đổi XP lấy quà</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}

