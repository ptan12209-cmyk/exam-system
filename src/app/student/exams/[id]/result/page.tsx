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
    ArrowLeft,
    Home,
    Loader2,
    Medal,
    Star
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateStudentStats } from "@/lib/gamification"
import { XpBar, XpGainAnimation, LevelUpAnimation } from "@/components/gamification/XpBar"
import { NewBadgeAnimation } from "@/components/gamification/BadgeCard"

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
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // Gamification states
    const [xpGained, setXpGained] = useState<number | null>(null)
    const [showLevelUp, setShowLevelUp] = useState(false)
    const [newLevel, setNewLevel] = useState(1)
    const [newBadges, setNewBadges] = useState<string[]>([])
    const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)
    const [userXp, setUserXp] = useState(0)

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

            setCurrentUserId(user.id)

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

            // Get ALL submissions for this exam by this student (for retake tracking)
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

            // Check if can retake (0 = unlimited, otherwise check against max)
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

            // Award XP (only once - check localStorage)
            const xpAwardedKey = `xp_awarded_${examId}_${user.id}`
            if (!localStorage.getItem(xpAwardedKey)) {
                try {
                    const result = await updateStudentStats(user.id, allSubmissions[0].score)
                    setXpGained(result.xpGained)
                    setNewLevel(result.newLevel)
                    setUserXp(result.xpGained) // For XpBar

                    if (result.leveledUp) {
                        setShowLevelUp(true)
                    }

                    if (result.newBadges.length > 0) {
                        setNewBadges(result.newBadges)
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-green-400"
        if (score >= 5) return "text-yellow-400"
        return "text-red-400"
    }

    const getScoreMessage = (score: number) => {
        if (score >= 9) return "Xuất sắc! 🎉"
        if (score >= 8) return "Tốt lắm! 👏"
        if (score >= 6.5) return "Khá tốt! 👍"
        if (score >= 5) return "Đạt yêu cầu"
        return "Cần cố gắng thêm"
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!exam || !submission) return null

    return (
        <>
            {/* XP Gain Animation */}
            {xpGained !== null && xpGained > 0 && (
                <XpGainAnimation xpGained={xpGained} onComplete={() => setXpGained(null)} />
            )}

            {/* Level Up Animation */}
            {showLevelUp && (
                <LevelUpAnimation newLevel={newLevel} onComplete={() => setShowLevelUp(false)} />
            )}

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link href="/student/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Kết quả bài thi</h1>
                            <p className="text-slate-400 text-sm">{exam.title}</p>
                        </div>
                    </div>

                    {/* Score Card */}
                    <Card className="border-slate-700 bg-slate-800/50 mb-8 overflow-hidden">
                        <div className={cn(
                            "h-2",
                            submission.score >= 8 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                                submission.score >= 5 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                                    "bg-gradient-to-r from-red-500 to-pink-500"
                        )} />
                        <CardContent className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4">
                                <Trophy className={cn("w-12 h-12", getScoreColor(submission.score))} />
                            </div>

                            <p className={cn("text-6xl font-bold mb-2", getScoreColor(submission.score))}>
                                {submission.score.toFixed(1)}
                            </p>
                            <p className="text-xl text-slate-400 mb-4">{getScoreMessage(submission.score)}</p>

                            <div className="flex items-center justify-center gap-8 text-slate-400">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <span>{submission.correct_count} đúng</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <span>{exam.total_questions - submission.correct_count} sai</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    <span>{formatTime(submission.time_spent)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Answers */}
                    <Card className="border-slate-700 bg-slate-800/50 mb-8">
                        <CardHeader>
                            <CardTitle className="text-white">Chi tiết đáp án</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* MC Answers */}
                            {exam.correct_answers && exam.correct_answers.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-blue-400 mb-3">Trắc nghiệm ABCD</h3>
                                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                        {exam.correct_answers.map((correct, i) => {
                                            const studentAnswer = submission.student_answers?.[i]
                                            const isCorrect = studentAnswer === correct

                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "relative p-2 rounded-lg text-center",
                                                        isCorrect
                                                            ? "bg-green-500/10 border border-green-500/20"
                                                            : "bg-red-500/10 border border-red-500/20"
                                                    )}
                                                >
                                                    <p className="text-xs text-slate-400 mb-1">Câu {i + 1}</p>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className={cn(
                                                            "font-bold",
                                                            isCorrect ? "text-green-400" : "text-red-400"
                                                        )}>
                                                            {studentAnswer || "-"}
                                                        </span>
                                                        {!isCorrect && (
                                                            <span className="text-green-400 text-xs">→{correct}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TF Answers */}
                            {exam.tf_answers && exam.tf_answers.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium text-green-400 mb-3">Đúng/Sai</h3>
                                    <div className="space-y-3">
                                        {exam.tf_answers.map((tf, i) => {
                                            const studentTf = submission.tf_student_answers?.find(a => a.question === tf.question)
                                            return (
                                                <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                                                    <p className="text-sm text-slate-300 mb-2">Câu {tf.question}</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['a', 'b', 'c', 'd'] as const).map((sub) => {
                                                            const correct = tf[sub]
                                                            const student = studentTf?.[sub]
                                                            const isCorrect = student === correct
                                                            return (
                                                                <div key={sub} className={cn(
                                                                    "p-2 rounded text-center text-xs",
                                                                    isCorrect
                                                                        ? "bg-green-500/10 border border-green-500/20"
                                                                        : "bg-red-500/10 border border-red-500/20"
                                                                )}>
                                                                    <p className="text-slate-500">{sub})</p>
                                                                    <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                                                                        {student === true ? "Đ" : student === false ? "S" : "-"}
                                                                    </span>
                                                                    {!isCorrect && (
                                                                        <span className="text-green-400 ml-1">→{correct ? "Đ" : "S"}</span>
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

                            {/* SA Answers */}
                            {exam.sa_answers && exam.sa_answers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-purple-400 mb-3">Trả lời ngắn</h3>
                                    <div className="space-y-2">
                                        {exam.sa_answers.map((sa, i) => {
                                            const studentSa = submission.sa_student_answers?.find(a => a.question === sa.question)
                                            const correctVal = parseFloat(sa.answer.toString().replace(',', '.'))
                                            const studentVal = parseFloat((studentSa?.answer || "0").replace(',', '.'))
                                            const tolerance = Math.abs(correctVal) * 0.05
                                            const isCorrect = Math.abs(correctVal - studentVal) <= tolerance

                                            return (
                                                <div key={i} className={cn(
                                                    "flex items-center gap-4 p-3 rounded-lg",
                                                    isCorrect
                                                        ? "bg-green-500/10 border border-green-500/20"
                                                        : "bg-red-500/10 border border-red-500/20"
                                                )}>
                                                    <span className="text-sm text-slate-300 w-16">Câu {sa.question}</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        isCorrect ? "text-green-400" : "text-red-400"
                                                    )}>
                                                        {studentSa?.answer || "-"}
                                                    </span>
                                                    {!isCorrect && (
                                                        <span className="text-green-400 text-sm">→ {sa.answer}</span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Leaderboard */}
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Medal className="w-5 h-5 text-yellow-400" />
                                Bảng xếp hạng
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {leaderboard.map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg",
                                            entry.id === submission.id
                                                ? "bg-blue-500/10 border border-blue-500/20"
                                                : "bg-slate-700/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                                    index === 1 ? "bg-slate-400/20 text-slate-300" :
                                                        index === 2 ? "bg-orange-500/20 text-orange-400" :
                                                            "bg-slate-700 text-slate-400"
                                            )}>
                                                {index + 1}
                                            </span>
                                            <span className={cn(
                                                "font-medium",
                                                entry.id === submission.id ? "text-blue-400" : "text-white"
                                            )}>
                                                {entry.profile?.full_name || "Ẩn danh"}
                                                {entry.id === submission.id && " (Bạn)"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={cn(
                                                "font-bold",
                                                getScoreColor(entry.score)
                                            )}>
                                                {entry.score.toFixed(1)}
                                            </span>
                                            <span className="text-slate-500 text-sm">
                                                {formatTime(entry.time_spent)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        {/* Retake Button */}
                        {canRetake && (
                            <div className="text-center">
                                <Link href={`/student/exams/${examId}/take`}>
                                    <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                                        🔄 Làm lại bài thi
                                    </Button>
                                </Link>
                                <p className="text-xs text-slate-400 mt-2">
                                    {maxAttempts === 0
                                        ? `Đã làm ${attemptsUsed} lần (không giới hạn)`
                                        : `Còn ${maxAttempts - attemptsUsed}/${maxAttempts} lượt`
                                    }
                                </p>
                            </div>
                        )}

                        {!canRetake && maxAttempts > 0 && (
                            <p className="text-sm text-slate-500 text-center">
                                Đã hết lượt làm bài ({attemptsUsed}/{maxAttempts})
                            </p>
                        )}

                        {/* Back Button */}
                        <Link href="/student/dashboard">
                            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                <Home className="w-4 h-4 mr-2" />
                                Về trang chủ
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    )
}
