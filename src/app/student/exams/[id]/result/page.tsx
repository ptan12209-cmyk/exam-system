"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Trophy,
    CheckCircle2,
    XCircle,
    Clock,
    Home,
    Loader2,
    Medal,
    ArrowRight,
    Share2,
    RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateStudentStats } from "@/lib/gamification"
import { XpGainAnimation, LevelUpAnimation } from "@/components/gamification/XpBar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

// Type definitions
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }

interface Exam {
    id: string
    title: string
    total_questions: number
    correct_answers: string[]
    mc_answers?: { question: number; answer: string }[]
    tf_answers?: TFAnswer[]
    sa_answers?: SAAnswer[]
}

interface Submission {
    id: string
    student_answers: string[]
    score: number
    correct_count: number
    time_spent: number
    submitted_at: string
    mc_correct?: number
    tf_correct?: number
    sa_correct?: number
    mc_student_answers?: { question: number; answer: string }[]
    tf_student_answers?: TFStudentAnswer[]
    sa_student_answers?: SAStudentAnswer[]
}

interface LeaderboardEntry {
    id: string
    score: number
    time_spent: number
    profile: {
        full_name: string | null
    }
}

export default function ExamResultPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const supabase = createClient()

    const [exam, setExam] = useState<Exam | null>(null)
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [fullName, setFullName] = useState("")

    // Gamification states
    const [xpGained, setXpGained] = useState<number | null>(null)
    const [showLevelUp, setShowLevelUp] = useState(false)
    const [newLevel, setNewLevel] = useState(1)

    // Retake states
    const [canRetake, setCanRetake] = useState(false)
    const [attemptsUsed, setAttemptsUsed] = useState(0)
    const [maxAttempts, setMaxAttempts] = useState(1)

    useEffect(() => {
        const fetchData = async () => {
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

            // Get exam
            const { data: examData } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .single()

            if (!examData) {
                router.push("/student/dashboard")
                return
            }

            setExam(examData)
            const examMaxAttempts = examData.max_attempts ?? 1
            setMaxAttempts(examMaxAttempts)

            // Get ALL submissions for this exam by this student
            const { data: allSubmissions, count } = await supabase
                .from("submissions")
                .select("*", { count: "exact" })
                .eq("exam_id", examId)
                .eq("student_id", user.id)
                .order("score", { ascending: false }) // Best score first

            if (!allSubmissions || allSubmissions.length === 0) {
                router.push(`/student/exams/${examId}/take`)
                return
            }

            // Use best score submission for display
            setSubmission(allSubmissions[0])
            setAttemptsUsed(count ?? allSubmissions.length)

            // Check if can retake
            if (examMaxAttempts === 0 || (count ?? 0) < examMaxAttempts) {
                setCanRetake(true)
            }

            // Get leaderboard
            const { data: leaderboardData } = await supabase
                .from("submissions")
                .select("id, score, time_spent, student_id, profile:profiles(full_name)")
                .eq("exam_id", examId)
                .order("score", { ascending: false })
                .order("time_spent", { ascending: true })
                .limit(10)

            if (leaderboardData) {
                setLeaderboard(leaderboardData as any)
            }

            // Award XP logic
            const xpAwardedKey = `xp_awarded_${examId}_${user.id}_${allSubmissions[0].id}`
            if (!localStorage.getItem(xpAwardedKey)) {
                try {
                    const result = await updateStudentStats(user.id, allSubmissions[0].score)
                    setXpGained(result.xpGained)
                    setNewLevel(result.newLevel)

                    if (result.leveledUp) {
                        setShowLevelUp(true)
                    }

                    localStorage.setItem(xpAwardedKey, "true")
                } catch (err) {
                    console.error("Failed to update stats:", err)
                }
            }

            setLoading(false)
        }

        fetchData()
    }, [examId, router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getScoreColor = (score: number) => {
        if (score >= 9) return "text-emerald-600"
        if (score >= 8) return "text-green-600"
        if (score >= 6.5) return "text-blue-600"
        if (score >= 5) return "text-yellow-600"
        return "text-red-600"
    }

    const getScoreMessage = (score: number) => {
        if (score >= 9) return "Xuất sắc! 🎉"
        if (score >= 8) return "Làm tốt lắm! 👏"
        if (score >= 6.5) return "Khá tốt! 👍"
        if (score >= 5) return "Đạt yêu cầu"
        return "Cần cố gắng thêm"
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!exam || !submission) return null

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Gamification Animations */}
            {xpGained !== null && xpGained > 0 && (
                <XpGainAnimation xpGained={xpGained} onComplete={() => setXpGained(null)} />
            )}
            {showLevelUp && (
                <LevelUpAnimation newLevel={newLevel} onComplete={() => setShowLevelUp(false)} />
            )}

            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-5xl mx-auto px-4 py-8">
                {/* Result Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{exam.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">Kết quả bài làm của bạn</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: Score & Details (2/3) */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Score Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                            {/* Decorative Background */}
                            <div className={cn(
                                "absolute top-0 left-0 w-full h-2",
                                submission.score >= 8 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                                    submission.score >= 5 ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                                        "bg-gradient-to-r from-red-400 to-pink-500"
                            )} />

                            <div className="p-8 text-center relative z-10">
                                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gray-50 dark:bg-white/10 mb-6 shadow-inner relative">
                                    <Trophy className={cn("w-14 h-14", getScoreColor(submission.score))} />
                                    {submission.score >= 9 && (
                                        <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>
                                    )}
                                </div>

                                <div className="space-y-2 mb-6">
                                    <h2 className={cn("text-6xl font-black tracking-tight", getScoreColor(submission.score))}>
                                        {submission.score.toFixed(1)}
                                    </h2>
                                    <p className="text-xl font-medium text-gray-600 dark:text-gray-300">{getScoreMessage(submission.score)}</p>
                                </div>

                                <div className="flex items-center justify-center gap-4 md:gap-12 py-6 border-t border-gray-50 dark:border-white/10">
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            <span className="text-xl font-bold text-gray-800 dark:text-white">{submission.correct_count}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Câu đúng</p>
                                    </div>
                                    <div className="w-px h-12 bg-gray-100 dark:bg-white/10" />
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <XCircle className="w-5 h-5 text-red-500" />
                                            <span className="text-xl font-bold text-gray-800 dark:text-white">
                                                {exam.total_questions - submission.correct_count}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Câu sai</p>
                                    </div>
                                    <div className="w-px h-12 bg-gray-100 dark:bg-white/10" />
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <Clock className="w-5 h-5 text-blue-500" />
                                            <span className="text-xl font-bold text-gray-800 dark:text-white">
                                                {formatTime(submission.time_spent)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Thời gian</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Answers Section */}
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-50 dark:border-slate-800">
                                <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2">
                                    Chi tiết bài làm
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {/* MC Answers */}
                                {exam.correct_answers && exam.correct_answers.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Trắc nghiệm
                                        </h3>
                                        <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                            {exam.correct_answers.map((correct, i) => {
                                                const studentAnswer = submission.student_answers?.[i]
                                                const isCorrect = studentAnswer === correct

                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "relative aspect-square flex flex-col items-center justify-center rounded-lg border",
                                                            isCorrect
                                                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                                        )}
                                                    >
                                                        <span className="text-[10px] text-gray-400 absolute top-1">{i + 1}</span>
                                                        <span className={cn(
                                                            "font-bold text-lg",
                                                            isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                                                        )}>
                                                            {studentAnswer || "-"}
                                                        </span>
                                                        {!isCorrect && (
                                                            <div className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-800 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-400 shadow-sm z-10">
                                                                {correct}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* True/False Answers */}
                                {exam.tf_answers && exam.tf_answers.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Đúng / Sai
                                        </h3>
                                        <div className="space-y-3">
                                            {exam.tf_answers.map((tf, i) => {
                                                const studentTf = submission.tf_student_answers?.find(a => a.question === tf.question)
                                                return (
                                                    <div key={i} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700">
                                                        <div className="mb-2 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                                            <span>Câu {tf.question}</span>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {(['a', 'b', 'c', 'd'] as const).map((sub) => {
                                                                const correct = tf[sub]
                                                                const student = studentTf?.[sub]
                                                                const isCorrect = student === correct

                                                                return (
                                                                    <div key={sub} className={cn(
                                                                        "p-2 rounded text-center text-xs relative",
                                                                        isCorrect
                                                                            ? "bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 shadow-sm"
                                                                            : "bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 shadow-sm"
                                                                    )}>
                                                                        <span className="absolute top-1 left-2 text-[10px] text-gray-400 uppercase">{sub}</span>
                                                                        <span className="font-bold block mt-3">
                                                                            {student === true ? "Đúng" : student === false ? "Sai" : "-"}
                                                                        </span>
                                                                        {!isCorrect && (
                                                                            <span className="text-[10px] text-green-600 font-medium block mt-1">
                                                                                Đáp án: {correct ? "Đúng" : "Sai"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Actions & Leaderboard (1/3) */}
                    <div className="space-y-6">
                        {/* Action Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Thao tác</h3>
                            <div className="space-y-3">
                                {canRetake && (
                                    <Link href={`/student/exams/${examId}/take`} className="block">
                                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200">
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Làm lại bài thi
                                        </Button>
                                    </Link>
                                )}

                                <div className="text-center text-xs text-gray-400 mb-2">
                                    {maxAttempts === 0
                                        ? `Đã làm ${attemptsUsed} lần (Không giới hạn)`
                                        : `Đã dùng ${attemptsUsed}/${maxAttempts} lượt làm bài`
                                    }
                                </div>

                                <Link href="/student/dashboard" className="block">
                                    <Button variant="outline" className="w-full border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                                        <Home className="w-4 h-4 mr-2" />
                                        Về trang chủ
                                    </Button>
                                </Link>

                                <Button variant="ghost" className="w-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Chia sẻ kết quả
                                </Button>
                            </div>
                        </div>

                        {/* Leaderboard Widget */}
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800 pb-4">
                                <CardTitle className="text-yellow-800 dark:text-yellow-400 flex items-center gap-2 text-base">
                                    <Medal className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    Bảng xếp hạng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {leaderboard.map((entry, index) => (
                                        <div
                                            key={entry.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors",
                                                entry.id === submission.id ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-50/80 dark:hover:bg-blue-900/30" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                                                    index === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" :
                                                        index === 1 ? "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300" :
                                                            index === 2 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" :
                                                                "text-gray-400"
                                                )}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className={cn(
                                                        "text-sm font-medium",
                                                        entry.id === submission.id ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
                                                    )}>
                                                        {entry.profile?.full_name || "Ẩn danh"}
                                                        {entry.id === submission.id && " (Bạn)"}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{formatTime(entry.time_spent)}</p>
                                                </div>
                                            </div>
                                            <div className="font-bold text-gray-800 dark:text-white">
                                                {entry.score.toFixed(1)}
                                            </div>
                                        </div>
                                    ))}
                                    {leaderboard.length === 0 && (
                                        <div className="p-8 text-center text-gray-400 text-sm">
                                            Chưa có bảng xếp hạng
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
