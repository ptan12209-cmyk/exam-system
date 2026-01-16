"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    ArrowLeft,
    Users,
    Trophy,
    Clock,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
    Medal
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Exam {
    id: string
    title: string
    total_questions: number
    duration: number
}

interface Submission {
    id: string
    student_id: string
    score: number
    correct_count: number
    time_spent: number
    submitted_at: string
    profile: {
        full_name: string | null
    }
}

export default function ExamScoresPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const supabase = createClient()

    const [exam, setExam] = useState<Exam | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Get exam
            const { data: examData, error: examError } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .eq("teacher_id", user.id)
                .single()

            if (examError || !examData) {
                router.push("/teacher/dashboard")
                return
            }

            setExam(examData)

            // Get submissions with student profiles
            const { data: submissionsData, error: subError } = await supabase
                .from("submissions")
                .select(`
                    id,
                    student_id,
                    score,
                    correct_count,
                    time_spent,
                    submitted_at
                `)
                .eq("exam_id", examId)
                .order("score", { ascending: false })
                .order("time_spent", { ascending: true })

            console.log("Submissions query result:", { submissionsData, subError })

            if (submissionsData && submissionsData.length > 0) {
                // Fetch profiles separately
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const studentIds = submissionsData.map((s: any) => s.student_id)
                const { data: profilesData } = await supabase
                    .from("profiles")
                    .select("id, full_name")
                    .in("id", studentIds)

                // Merge data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const merged = submissionsData.map((sub: any) => ({
                    ...sub,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    profile: profilesData?.find((p: any) => p.id === sub.student_id) || { full_name: null }
                }))
                setSubmissions(merged as Submission[])
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

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-green-400"
        if (score >= 5) return "text-yellow-400"
        return "text-red-400"
    }

    const getScoreBg = (score: number) => {
        if (score >= 8) return "bg-green-500/10 border-green-500/20"
        if (score >= 5) return "bg-yellow-500/10 border-yellow-500/20"
        return "bg-red-500/10 border-red-500/20"
    }

    // Statistics
    const stats = {
        total: submissions.length,
        avg: submissions.length > 0
            ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1)
            : "0",
        passed: submissions.filter(s => s.score >= 5).length,
        highest: submissions.length > 0 ? Math.max(...submissions.map(s => s.score)).toFixed(1) : "0"
    }

    const handleExportExcel = async () => {
        const { exportToExcel } = await import("@/lib/excel-export");

        const submissionData = submissions.map((s, i) => ({
            index: i + 1,
            fullName: s.profile?.full_name || "Học sinh",
            score: s.score,
            correctCount: s.correct_count,
            totalQuestions: exam?.total_questions || 0,
            timeSpent: s.time_spent,
            submittedAt: s.submitted_at
        }));

        await exportToExcel(
            {
                title: exam?.title || "Bài thi",
                totalQuestions: exam?.total_questions || 0,
                duration: exam?.duration || 0
            },
            submissionData
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!exam) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Điểm bài thi</h1>
                            <p className="text-slate-400 text-sm">{exam.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/teacher/exams/${examId}/edit`}>
                            <Button
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                ✏️ Sửa đáp án
                            </Button>
                        </Link>
                        <Button
                            onClick={handleExportExcel}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Xuất Excel
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                            <p className="text-xs text-slate-400">Đã nộp</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                            <p className="text-2xl font-bold text-yellow-400">{stats.avg}</p>
                            <p className="text-xs text-slate-400">Điểm TB</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4 text-center">
                            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
                            <p className="text-2xl font-bold text-green-400">{stats.passed}</p>
                            <p className="text-xs text-slate-400">Đạt (≥5)</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-4 text-center">
                            <Medal className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                            <p className="text-2xl font-bold text-purple-400">{stats.highest}</p>
                            <p className="text-xs text-slate-400">Điểm cao nhất</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Submissions Table */}
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white">Danh sách học sinh</CardTitle>
                        <CardDescription className="text-slate-400">
                            Xếp theo điểm từ cao đến thấp
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submissions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Chưa có học sinh nào nộp bài</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left p-3 text-slate-400 text-sm font-medium">Hạng</th>
                                            <th className="text-left p-3 text-slate-400 text-sm font-medium">Học sinh</th>
                                            <th className="text-center p-3 text-slate-400 text-sm font-medium">Điểm</th>
                                            <th className="text-center p-3 text-slate-400 text-sm font-medium">Đúng/Sai</th>
                                            <th className="text-center p-3 text-slate-400 text-sm font-medium">Thời gian</th>
                                            <th className="text-right p-3 text-slate-400 text-sm font-medium">Nộp lúc</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((sub, index) => (
                                            <tr
                                                key={sub.id}
                                                className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                                            >
                                                <td className="p-3">
                                                    <span className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                        index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                                            index === 1 ? "bg-slate-400/20 text-slate-300" :
                                                                index === 2 ? "bg-orange-500/20 text-orange-400" :
                                                                    "bg-slate-700 text-slate-400"
                                                    )}>
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <p className="font-medium text-white">
                                                        {sub.profile?.full_name || `Học sinh ${sub.student_id.slice(0, 8)}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        ID: {sub.student_id.slice(0, 8)}...
                                                    </p>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-sm font-bold border",
                                                        getScoreBg(sub.score),
                                                        getScoreColor(sub.score)
                                                    )}>
                                                        {sub.score.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="text-green-400">{sub.correct_count}</span>
                                                    <span className="text-slate-500">/</span>
                                                    <span className="text-red-400">{exam.total_questions - sub.correct_count}</span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-slate-400">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{formatTime(sub.time_spent)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right text-slate-400 text-sm">
                                                    {formatDate(sub.submitted_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
