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
    Medal,
    Eye,
    Edit3
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LiveParticipants } from "@/components/realtime/LiveParticipants"
import { SubmissionFeed } from "@/components/realtime/SubmissionFeed"

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
        if (score >= 8) return "text-green-600 bg-green-50 border-green-200"
        if (score >= 5) return "text-yellow-600 bg-yellow-50 border-yellow-200"
        return "text-red-600 bg-red-50 border-red-200"
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
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!exam) return null

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Kết quả thi</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{exam.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/teacher/exams/${examId}/edit`}>
                            <Button
                                variant="outline"
                                className="border-gray-300 text-gray-600 hover:bg-white hover:text-blue-600"
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Sửa đáp án
                            </Button>
                        </Link>
                        <Button
                            onClick={handleExportExcel}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Xuất Excel
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Đã nộp</p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3">
                                <Trophy className="w-5 h-5 text-yellow-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats.avg}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Điểm TB</p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats.passed}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Đạt (≥5)</p>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                                <Medal className="w-5 h-5 text-purple-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-800">{stats.highest}</p>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Cao nhất</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Real-time Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <LiveParticipants examId={examId} />
                    <SubmissionFeed examId={examId} />
                </div>

                {/* Submissions Table */}
                <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800">Danh sách học sinh</CardTitle>
                                <CardDescription className="text-gray-500 mt-1">
                                    Xếp theo điểm từ cao đến thấp
                                </CardDescription>
                            </div>
                            <div className="text-sm text-gray-500">
                                {submissions.length} bản ghi
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {submissions.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">Chưa có học sinh nào nộp bài</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase w-16 text-center">Hạng</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Học sinh</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Điểm</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Số câu đúng</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center">Thời gian</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-right">Nộp lúc</th>
                                            <th className="p-4 text-xs font-semibold text-gray-500 uppercase text-center w-24">Chi tiết</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {submissions.map((sub, index) => (
                                            <tr
                                                key={sub.id}
                                                className="hover:bg-blue-50/30 transition-colors group"
                                            >
                                                <td className="p-4 text-center">
                                                    <span className={cn(
                                                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-sm",
                                                        index === 0 ? "bg-yellow-100 text-yellow-700 border border-yellow-200" :
                                                            index === 1 ? "bg-gray-200 text-gray-700 border border-gray-300" :
                                                                index === 2 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                                                    "bg-white text-gray-500 border border-gray-200"
                                                    )}>
                                                        {index + 1}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                                            {sub.profile?.full_name?.charAt(0) || sub.student_id.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {sub.profile?.full_name || `Học sinh ${sub.student_id.slice(0, 8)}`}
                                                            </p>
                                                            <p className="text-xs text-gray-400 font-mono">
                                                                #{sub.student_id.slice(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-sm font-bold border inline-block min-w-[3rem]",
                                                        getScoreColor(sub.score)
                                                    )}>
                                                        {sub.score.toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center gap-1 font-medium text-sm">
                                                        <span className="text-green-600">{sub.correct_count}</span>
                                                        <span className="text-gray-300">/</span>
                                                        <span className="text-gray-500">{exam.total_questions}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium border border-gray-100">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{formatTime(sub.time_spent)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right text-gray-500 text-sm">
                                                    {formatDate(sub.submitted_at)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Link href={`/teacher/exams/${examId}/submissions/${sub.id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </Button>
                                                    </Link>
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
