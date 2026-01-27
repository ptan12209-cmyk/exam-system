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
    Loader2,
    Calendar,
    Mail
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
        if (score >= 8) return "text-green-600"
        if (score >= 5) return "text-yellow-600"
        return "text-red-600"
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
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
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href={`/teacher/exams/${examId}/scores`}>
                            <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Chi tiết bài làm</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{exam.title}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Student Info Card */}
                    <Card className="col-span-1 lg:col-span-2 border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 h-24 relative">
                            <div className="absolute -bottom-10 left-6">
                                <div className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-800 shadow-md flex items-center justify-center">
                                    <div className="w-full h-full rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl">
                                        {profile?.full_name?.charAt(0) || <User className="w-8 h-8" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <CardContent className="pt-12 px-6 pb-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {profile?.full_name || "Học sinh"}
                                    </h2>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mt-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        {profile?.email || "Không có email"}
                                    </div>
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <div className="flex-1 md:flex-none p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 text-center min-w-[100px]">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Điểm số</p>
                                        <div className={cn("text-3xl font-bold", getScoreColor(submission.score))}>
                                            {submission.score.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                                <div className="text-center">
                                    <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mx-auto mb-2">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white">{submission.correct_count}/{exam.total_questions}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Số câu đúng</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white">{formatTime(submission.time_spent)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Thời gian làm</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white mt-2">{formatDate(submission.submitted_at)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Thời gian nộp</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Stats or Actions (Optional - currently using space for layout balance) */}
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-center">
                        <CardContent className="p-6 text-center space-y-4">
                            <div className="p-4 rounded-full bg-green-50 dark:bg-green-900/20 w-20 h-20 mx-auto flex items-center justify-center">
                                {(submission.score / 10) >= 0.5 ? (
                                    <CheckCircle2 className="w-10 h-10 text-green-500 dark:text-green-400" />
                                ) : (
                                    <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    {(submission.score / 10) >= 0.8 ? "Xuất sắc!" :
                                        (submission.score / 10) >= 0.65 ? "Làm tốt lắm!" :
                                            (submission.score / 10) >= 0.5 ? "Đạt yêu cầu" : "Cần cố gắng"}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                    Học sinh đã hoàn thành {Math.round((submission.correct_count / exam.total_questions) * 100)}% bài thi chính xác.
                                </p>
                            </div>
                            <Button className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 mt-2" variant="outline">
                                Gửi nhận xét (Coming soon)
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Multiple Choice Answers */}
                {mcCorrectAnswers.length > 0 && (
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 mb-6">
                        <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
                            <CardTitle className="text-base text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                Trắc nghiệm ({mcCorrectAnswers.length} câu)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {mcCorrectAnswers.map((correct, index) => {
                                    const studentAnswer = studentMcAnswers.find(a => a.question === correct.question)?.answer
                                    const isCorrect = studentAnswer?.toUpperCase() === correct.answer?.toUpperCase()

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                "p-3 rounded-xl border flex flex-col items-center transition-all",
                                                isCorrect
                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 shadow-sm"
                                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 mb-2 w-full justify-center border-b border-black/5 dark:border-white/5 pb-2">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Câu {correct.question}</span>
                                                {isCorrect ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center gap-1 w-full">
                                                <div className="flex items-center gap-2 w-full justify-center">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">HS:</span>
                                                    <span className={cn(
                                                        "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                                                        isCorrect ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                                                    )}>
                                                        {studentAnswer || "—"}
                                                    </span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="flex items-center gap-2 w-full justify-center">
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">ĐA:</span>
                                                        <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                                            {correct.answer}
                                                        </span>
                                                    </div>
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
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 mb-6">
                        <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
                            <CardTitle className="text-base text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                                Đúng/Sai ({tfAnswers.length} câu)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tfAnswers.map((tf, index) => {
                                    const studentTf = studentTfAnswers.find(a => a.question === tf.question)
                                    const qNum = mcCount + 1 + index

                                    return (
                                        <div key={index} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-slate-700 pb-2">Câu {qNum}</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                                    const correctVal = tf[opt]
                                                    const studentVal = studentTf?.[opt]
                                                    const isCorrect = studentVal === correctVal

                                                    return (
                                                        <div
                                                            key={opt}
                                                            className={cn(
                                                                "p-2 rounded-lg text-center flex flex-col items-center justify-center border",
                                                                isCorrect
                                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                                            )}
                                                        >
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{opt}</span>
                                                            <div className="flex items-center gap-1">
                                                                {/* Student Answer */}
                                                                <span className={cn(
                                                                    "font-bold text-sm",
                                                                    studentVal ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                                )}>
                                                                    {studentVal ? "Đ" : "S"}
                                                                </span>

                                                                {/* Correct Answer Indicator if wrong */}
                                                                {!isCorrect && (
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                        ({correctVal ? "Đ" : "S"})
                                                                    </span>
                                                                )}
                                                            </div>
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
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 mb-6">
                        <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 pb-4">
                            <CardTitle className="text-base text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                Trả lời ngắn ({saAnswers.length} câu)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                "p-4 rounded-xl border transition-all",
                                                isCorrect
                                                    ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:shadow-sm"
                                                    : "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:shadow-sm"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-3 border-b border-black/5 dark:border-white/5 pb-2">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Câu {qNum}</span>
                                                {isCorrect ? (
                                                    <div className="flex items-center text-green-600 dark:text-green-400 text-xs font-medium">
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        Đúng
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-500 dark:text-red-400 text-xs font-medium">
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        Sai
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-500 dark:text-gray-400">Học sinh:</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                                                    )}>
                                                        {studentSa?.answer || "—"}
                                                    </span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-red-200 dark:border-red-800">
                                                        <span className="text-gray-500 dark:text-gray-400">Đáp án đúng:</span>
                                                        <span className="font-bold text-green-700 dark:text-green-300">
                                                            {sa.answer}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-center mt-8">
                    <Link href={`/teacher/exams/${examId}/scores`}>
                        <Button variant="outline" className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Quay lại danh sách
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
