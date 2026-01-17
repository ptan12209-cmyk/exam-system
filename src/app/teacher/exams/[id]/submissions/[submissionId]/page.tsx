"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    User,
    Clock,
    Trophy,
    CheckCircle2,
    XCircle,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Exam {
    id: string
    title: string
    total_questions: number
    mc_answers: { question: number; answer: string }[] | null
    tf_answers: { question: number; a: boolean; b: boolean; c: boolean; d: boolean }[] | null
    sa_answers: { question: number; answer: string | number }[] | null
    correct_answers: string[] | null
}

interface Submission {
    id: string
    student_id: string
    score: number
    correct_count: number
    time_spent: number
    submitted_at: string
    student_answers: (string | null)[] | null
    mc_student_answers: { question: number; answer: string | null }[] | null
    tf_student_answers: { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }[] | null
    sa_student_answers: { question: number; answer: string }[] | null
}

interface Profile {
    full_name: string | null
    email: string | null
}

export default function SubmissionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const submissionId = params.submissionId as string
    const supabase = createClient()

    const [exam, setExam] = useState<Exam | null>(null)
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Get exam (verify teacher owns it)
            const { data: examData } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .eq("teacher_id", user.id)
                .single()

            if (!examData) {
                router.push("/teacher/dashboard")
                return
            }
            setExam(examData)

            // Get submission
            const { data: submissionData } = await supabase
                .from("submissions")
                .select("*")
                .eq("id", submissionId)
                .eq("exam_id", examId)
                .single()

            if (!submissionData) {
                router.push(`/teacher/exams/${examId}/scores`)
                return
            }
            setSubmission(submissionData)

            // Get student profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", submissionData.student_id)
                .single()

            setProfile(profileData)
            setLoading(false)
        }

        fetchData()
    }, [examId, submissionId, router, supabase])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-green-400"
        if (score >= 5) return "text-yellow-400"
        return "text-red-400"
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!exam || !submission) return null

    // Get correct answers array
    const mcCorrectAnswers = exam.mc_answers ||
        (exam.correct_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []

    const studentMcAnswers = submission.mc_student_answers ||
        (submission.student_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []

    const mcCount = mcCorrectAnswers.length
    const tfAnswers = exam.tf_answers || []
    const saAnswers = exam.sa_answers || []
    const studentTfAnswers = submission.tf_student_answers || []
    const studentSaAnswers = submission.sa_student_answers || []

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href={`/teacher/exams/${examId}/scores`}>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Chi tiết bài làm</h1>
                            <p className="text-slate-400 text-sm">{exam.title}</p>
                        </div>
                    </div>
                </div>

                {/* Student Info Card */}
                <Card className="border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-800/50 mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white">
                                    {profile?.full_name || "Học sinh"}
                                </h2>
                                <p className="text-slate-400 text-sm">{profile?.email || "Không có email"}</p>
                            </div>
                            <div className="text-right">
                                <div className={cn("text-4xl font-bold", getScoreColor(submission.score))}>
                                    {submission.score.toFixed(1)}
                                </div>
                                <p className="text-slate-400 text-sm">điểm</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                                <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                                <p className="text-lg font-bold text-white">{submission.correct_count}/{exam.total_questions}</p>
                                <p className="text-xs text-slate-400">Số đúng</p>
                            </div>
                            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                                <Clock className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                                <p className="text-lg font-bold text-white">{formatTime(submission.time_spent)}</p>
                                <p className="text-xs text-slate-400">Thời gian</p>
                            </div>
                            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-400" />
                                <p className="text-lg font-bold text-white">{formatDate(submission.submitted_at)}</p>
                                <p className="text-xs text-slate-400">Nộp lúc</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Multiple Choice Answers */}
                {mcCorrectAnswers.length > 0 && (
                    <Card className="border-slate-700 bg-slate-800/50 mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">📝 Trắc nghiệm ({mcCorrectAnswers.length} câu)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {mcCorrectAnswers.map((correct, index) => {
                                    const studentAnswer = studentMcAnswers.find(a => a.question === correct.question)?.answer
                                    const isCorrect = studentAnswer?.toUpperCase() === correct.answer?.toUpperCase()

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "p-3 rounded-lg border flex flex-col items-center",
                                                isCorrect
                                                    ? "bg-green-500/10 border-green-500/30"
                                                    : "bg-red-500/10 border-red-500/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-slate-400">Câu {correct.question}</span>
                                                {isCorrect ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <span className={cn(
                                                    "px-2 py-1 rounded text-sm font-bold",
                                                    isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                                )}>
                                                    {studentAnswer || "—"}
                                                </span>
                                                {!isCorrect && (
                                                    <>
                                                        <span className="text-slate-500">→</span>
                                                        <span className="px-2 py-1 rounded text-sm font-bold bg-green-500/20 text-green-400">
                                                            {correct.answer}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* True/False Answers */}
                {tfAnswers.length > 0 && (
                    <Card className="border-slate-700 bg-slate-800/50 mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">✅ Đúng/Sai ({tfAnswers.length} câu)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tfAnswers.map((tf, index) => {
                                    const studentTf = studentTfAnswers.find(a => a.question === tf.question)
                                    const qNum = mcCount + 1 + index

                                    return (
                                        <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                                            <p className="text-sm font-medium text-slate-300 mb-3">Câu {qNum}</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                                    const correctVal = tf[opt]
                                                    const studentVal = studentTf?.[opt]
                                                    const isCorrect = studentVal === correctVal

                                                    return (
                                                        <div
                                                            key={opt}
                                                            className={cn(
                                                                "p-2 rounded text-center text-sm",
                                                                isCorrect
                                                                    ? "bg-green-500/20 border border-green-500/30"
                                                                    : "bg-red-500/20 border border-red-500/30"
                                                            )}
                                                        >
                                                            <span className="font-bold text-slate-300">{opt.toUpperCase()}:</span>
                                                            <span className={cn("ml-1", isCorrect ? "text-green-400" : "text-red-400")}>
                                                                {studentVal ? "Đ" : "S"}
                                                            </span>
                                                            {!isCorrect && (
                                                                <span className="text-green-400 ml-1">(→{correctVal ? "Đ" : "S"})</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Short Answer */}
                {saAnswers.length > 0 && (
                    <Card className="border-slate-700 bg-slate-800/50 mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">✍️ Trả lời ngắn ({saAnswers.length} câu)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {saAnswers.map((sa, index) => {
                                    const studentSa = studentSaAnswers.find(a => a.question === sa.question)
                                    const qNum = mcCount + tfAnswers.length + 1 + index
                                    const correctVal = parseFloat(sa.answer.toString().replace(',', '.'))
                                    const studentVal = parseFloat(studentSa?.answer?.replace(',', '.') || '0')
                                    const tolerance = Math.abs(correctVal) * 0.05
                                    const isCorrect = Math.abs(correctVal - studentVal) <= tolerance

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "p-4 rounded-lg border",
                                                isCorrect
                                                    ? "bg-green-500/10 border-green-500/30"
                                                    : "bg-red-500/10 border-red-500/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-300">Câu {qNum}</span>
                                                {isCorrect ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-3">
                                                <span className="text-slate-400">Học sinh:</span>
                                                <span className={cn(
                                                    "px-3 py-1 rounded font-bold",
                                                    isCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                                )}>
                                                    {studentSa?.answer || "—"}
                                                </span>
                                                {!isCorrect && (
                                                    <>
                                                        <span className="text-slate-500">→</span>
                                                        <span className="text-slate-400">Đáp án:</span>
                                                        <span className="px-3 py-1 rounded font-bold bg-green-500/20 text-green-400">
                                                            {sa.answer}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Back Button */}
                <div className="flex justify-center">
                    <Link href={`/teacher/exams/${examId}/scores`}>
                        <Button variant="outline" className="border-slate-600 text-slate-300">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại danh sách
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
