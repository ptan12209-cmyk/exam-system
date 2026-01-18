"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    ArrowLeft,
    Clock,
    FileText,
    Loader2,
    CheckCircle2,
    Play
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    status: string
    created_at: string
    is_scheduled?: boolean
    start_time?: string
    end_time?: string
}

interface Submission {
    exam_id: string
    score: number
}

export default function StudentExamsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [exams, setExams] = useState<Exam[]>([])
    const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Fetch published exams
            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false })

            if (examsData) {
                setExams(examsData)
            }

            // Fetch user submissions
            const { data: subsData } = await supabase
                .from("submissions")
                .select("exam_id, score")
                .eq("student_id", user.id)

            if (subsData) {
                const subMap = new Map<string, number>()
                subsData.forEach((s: Submission) => {
                    const existing = subMap.get(s.exam_id)
                    if (!existing || s.score > existing) {
                        subMap.set(s.exam_id, s.score)
                    }
                })
                setSubmissions(subMap)
            }

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    const isExamAvailable = (exam: Exam) => {
        if (!exam.is_scheduled) return true
        const now = new Date()
        if (exam.start_time && new Date(exam.start_time) > now) return false
        if (exam.end_time && new Date(exam.end_time) < now) return false
        return true
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
            <header className="border-b border-slate-700/50 bg-slate-900/80 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/student/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Danh sách đề thi</h1>
                                <p className="text-sm text-slate-400">{exams.length} đề thi có sẵn</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {exams.length === 0 ? (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-12 text-center">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                            <h3 className="text-lg font-medium text-white mb-2">Chưa có đề thi nào</h3>
                            <p className="text-slate-400">Hãy quay lại sau khi giáo viên đăng đề thi mới</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {exams.map((exam) => {
                            const hasSubmitted = submissions.has(exam.id)
                            const bestScore = submissions.get(exam.id)
                            const available = isExamAvailable(exam)

                            return (
                                <Card
                                    key={exam.id}
                                    className={cn(
                                        "border-slate-700 transition-all",
                                        hasSubmitted
                                            ? "bg-green-500/5 border-green-500/20"
                                            : "bg-slate-800/50 hover:border-blue-500/30"
                                    )}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white mb-2">
                                                    {exam.title}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-4 h-4" />
                                                        {exam.total_questions} câu
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {exam.duration} phút
                                                    </span>
                                                    {hasSubmitted && (
                                                        <span className="flex items-center gap-1 text-green-400">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Điểm cao nhất: {bestScore?.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                                {!available && exam.is_scheduled && (
                                                    <p className="text-xs text-yellow-400 mt-2">
                                                        {exam.start_time && new Date(exam.start_time) > new Date()
                                                            ? `Mở lúc: ${new Date(exam.start_time).toLocaleString("vi-VN")}`
                                                            : "Đã hết hạn làm bài"}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {hasSubmitted && (
                                                    <Link href={`/student/exams/${exam.id}/result`}>
                                                        <Button
                                                            variant="outline"
                                                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                                        >
                                                            Xem kết quả
                                                        </Button>
                                                    </Link>
                                                )}
                                                <Link href={`/student/exams/${exam.id}/take`}>
                                                    <Button
                                                        disabled={!available}
                                                        className={cn(
                                                            available
                                                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                                                : "bg-slate-700 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <Play className="w-4 h-4 mr-2" />
                                                        {hasSubmitted ? "Làm lại" : "Bắt đầu"}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
