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
    Loader2,
    PlayCircle,
    CheckCircle2,
    ArrowRight,
    BookOpen,
    Video
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { XpBar } from "@/components/gamification/XpBar"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { GamificationHub } from "@/components/gamification/GamificationHub"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"

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
    subject?: string  // Môn học
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
    const [selectedSubject, setSelectedSubject] = useState<string>("all")  // Filter theo môn
    const [showGamification, setShowGamification] = useState(false)  // Toggle gamification drawer

    // Filter exams by subject
    const filteredExams = selectedSubject === "all"
        ? availableExams
        : availableExams.filter(e => e.subject === selectedSubject)

    // Calculate max score
    const maxScore = submissions.length > 0 ? Math.max(...submissions.map(s => s.score)) : 0

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
                    <div className="flex justify-between h-14 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">ExamHub</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />
                            <UserMenu
                                userName={profile?.full_name || ""}
                                userClass={profile?.class ?? undefined}
                                onLogout={handleLogout}
                                role="student"
                            />
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
                        {/* Compact Stats Bar */}
                        <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-x-auto">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg flex-shrink-0">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-slate-300">Đề thi:</span>
                                <span className="text-sm font-bold text-white">{availableExams.length}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-700 flex-shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg flex-shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-slate-300">Hoàn thành:</span>
                                <span className="text-sm font-bold text-white">{submissions.length}</span>
                            </div>
                            <div className="w-px h-6 bg-slate-700 flex-shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg flex-shrink-0">
                                <Trophy className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-slate-300">Cao nhất:</span>
                                <span className="text-sm font-bold text-white">
                                    {submissions.length > 0 ? Math.max(...submissions.map(s => s.score)).toFixed(1) : "--"}
                                </span>
                            </div>
                        </div>

                        {/* Quick Links - Compact */}
                        <div className="flex gap-3 mb-6">
                            <Link href="/resources" className="flex-1">
                                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-800/50 hover:to-pink-800/50 border border-purple-500/30 hover:border-purple-400/50 rounded-xl transition-all group">
                                    <span className="text-xl">📚</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">Kho Tài Liệu</p>
                                        <p className="text-xs text-slate-400 truncate">Đề thi thử</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                                </div>
                            </Link>
                            <Link href="/live" className="flex-1">
                                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-900/50 to-emerald-900/50 hover:from-green-800/50 hover:to-emerald-800/50 border border-green-500/30 hover:border-green-400/50 rounded-xl transition-all group">
                                    <span className="text-xl">📺</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">Phòng Live</p>
                                        <p className="text-xs text-slate-400 truncate">Chữa đề online</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                                </div>
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
                                {/* Subject Filter Tabs */}
                                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-700">
                                    <button
                                        onClick={() => setSelectedSubject("all")}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                            selectedSubject === "all"
                                                ? "bg-blue-500 text-white"
                                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                        )}
                                    >
                                        📚 Tất cả ({availableExams.length})
                                    </button>
                                    {SUBJECTS.filter(s => availableExams.some(e => e.subject === s.value)).map((s) => {
                                        const count = availableExams.filter(e => e.subject === s.value).length
                                        return (
                                            <button
                                                key={s.value}
                                                onClick={() => setSelectedSubject(s.value)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                                    selectedSubject === s.value
                                                        ? `bg-gradient-to-r ${s.color} text-white`
                                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                                )}
                                            >
                                                {s.icon} {s.label} ({count})
                                            </button>
                                        )
                                    })}
                                </div>

                                {filteredExams.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                        <p className="text-slate-400">Chưa có đề thi nào</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredExams.map((exam) => {
                                            const submitted = hasSubmitted(exam.id)
                                            const submission = getSubmission(exam.id)
                                            const subjectInfo = getSubjectInfo(exam.subject || "other")

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
                                                            "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                                                            `bg-gradient-to-br ${subjectInfo.color}`
                                                        )}>
                                                            {subjectInfo.icon}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {submitted && (
                                                                <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                                                                    Đã làm
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <h3 className="font-semibold text-white mb-1">{exam.title}</h3>
                                                    <span className="text-xs text-slate-500 mb-3 block">{subjectInfo.label}</span>

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

                    {/* Sidebar (1/3) - Gamification - Hidden on mobile, visible on lg+ */}
                    <div className="hidden lg:block space-y-3">
                        {/* Daily Check-in - Compact */}
                        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <DailyCheckIn onComplete={({ xp }) => setUserXp(prev => prev + xp)} />
                        </div>

                        {/* Gamification Hub - Tabs */}
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                            <GamificationHub currentUserId={userId || undefined} />
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    )
}

