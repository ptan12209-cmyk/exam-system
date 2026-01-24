"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    GraduationCap,
    ArrowLeft,
    BarChart3,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    Users,
    Trophy,
    Target,
    TrendingDown,
    TrendingUp,
    Calendar
} from "lucide-react"
import { ScoreDistributionChart, generateScoreDistribution } from "@/components/analytics/ScoreDistributionChart"
import { QuestionAnalysisTable, analyzeQuestions } from "@/components/analytics/QuestionAnalysisTable"
import { exportAnalyticsToExcel } from "@/lib/excel-export"
import { cn } from "@/lib/utils"

interface Exam {
    id: string
    title: string
    total_questions: number
    correct_answers: string[]
}

interface Submission {
    id: string
    exam_id: string
    score: number
    student_answers: string[]
    submitted_at: string
    student: {
        full_name: string | null
        class: string | null
    }
}

export default function TeacherAnalyticsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [exams, setExams] = useState<Exam[]>([])
    const [selectedExamId, setSelectedExamId] = useState<string>("")
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [stats, setStats] = useState({
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0 // >= 5 điểm
    })

    // Fetch teacher's exams
    useEffect(() => {
        async function fetchExams() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: examsData } = await supabase
                .from("exams")
                .select("id, title, total_questions, correct_answers")
                .eq("teacher_id", user.id)
                .eq("status", "published")
                .order("created_at", { ascending: false })

            if (examsData && examsData.length > 0) {
                setExams(examsData)
                setSelectedExamId(examsData[0].id)
            }
            setLoading(false)
        }

        fetchExams()
    }, [router, supabase])

    // Fetch submissions when exam changes
    useEffect(() => {
        async function fetchSubmissions() {
            if (!selectedExamId) return

            const { data: subsData } = await supabase
                .from("submissions")
                .select(`
          id,
          exam_id,
          score,
          student_answers,
          submitted_at,
          student:profiles!student_id(full_name, class)
        `)
                .eq("exam_id", selectedExamId)
                .order("score", { ascending: false })

            if (subsData) {
                // Transform data to handle the joined profile
                const transformedData = subsData.map((sub: {
                    id: string
                    exam_id: string
                    score: number
                    student_answers: string[]
                    submitted_at: string
                    student: { full_name: string | null; class: string | null } | { full_name: string | null; class: string | null }[] | null
                }) => ({
                    ...sub,
                    student: Array.isArray(sub.student) ? sub.student[0] : sub.student
                })) as Submission[]

                setSubmissions(transformedData)

                // Calculate stats
                const scores = transformedData.map(s => s.score)
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                    const passing = scores.filter(s => s >= 5).length
                    setStats({
                        totalStudents: scores.length,
                        averageScore: avg,
                        highestScore: Math.max(...scores),
                        lowestScore: Math.min(...scores),
                        passRate: (passing / scores.length) * 100
                    })
                } else {
                    setStats({
                        totalStudents: 0,
                        averageScore: 0,
                        highestScore: 0,
                        lowestScore: 0,
                        passRate: 0
                    })
                }
            }
        }

        fetchSubmissions()
    }, [selectedExamId, supabase])

    const selectedExam = exams.find(e => e.id === selectedExamId)

    const handleExportExcel = () => {
        if (!selectedExam || submissions.length === 0) return

        exportAnalyticsToExcel({
            examTitle: selectedExam.title,
            submissions: submissions.map(s => ({
                studentName: s.student?.full_name || "Ẩn danh",
                className: s.student?.class || "-",
                score: s.score,
                submittedAt: s.submitted_at
            })),
            stats
        })
    }

    const handleExportPDF = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-white bg-white shadow-sm border border-gray-200">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Thống kê & Phân tích</h1>
                            <p className="text-gray-500 text-sm mt-1">Phân tích chi tiết kết quả thi</p>
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <Card className="mb-6 border-gray-200 shadow-sm bg-white">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Chọn đề thi:</span>
                                <select
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    className="w-full md:w-64 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {exams.map((exam) => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="outline" onClick={handleExportExcel} disabled={submissions.length === 0} className="flex-1 md:flex-none border-gray-300 text-gray-700 hover:bg-gray-50">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportPDF} disabled={submissions.length === 0} className="flex-1 md:flex-none border-gray-300 text-gray-700 hover:bg-gray-50">
                                <FileText className="w-4 h-4 mr-2 text-red-600" />
                                In PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Học sinh</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                                <Target className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Điểm TB</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3">
                                <Trophy className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.highestScore.toFixed(1)}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Cao nhất</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.lowestScore.toFixed(1)}</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Thấp nhất</div>
                        </CardContent>
                    </Card>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                <GraduationCap className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.passRate.toFixed(0)}%</div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">Đạt (≥5)</div>
                        </CardContent>
                    </Card>
                </div>

                {exams.length === 0 ? (
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có dữ liệu</h3>
                            <p className="text-gray-500 mb-6">
                                Tạo đề thi và xuất bản để bắt đầu xem thống kê.
                            </p>
                            <Link href="/teacher/exams/create">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Tạo đề thi mới
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : submissions.length === 0 ? (
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa có bài nộp</h3>
                            <p className="text-gray-500">
                                Hãy chia sẻ đề thi để học sinh làm bài và xem kết quả tại đây.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution Chart */}
                        <Card className="border-gray-200 shadow-sm bg-white lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Phân bố điểm số
                                </CardTitle>
                                <CardDescription>Biểu đồ phổ điểm của học sinh</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScoreDistributionChart
                                    data={generateScoreDistribution(submissions.map(s => s.score))}
                                />
                            </CardContent>
                        </Card>

                        {/* Top Students Table */}
                        <Card className="border-gray-200 shadow-sm bg-white lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Bảng xếp hạng
                                </CardTitle>
                                <CardDescription>Top 10 học sinh có điểm cao nhất</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-hidden rounded-md border border-gray-100 m-4 mt-0">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                <th className="px-4 py-3 text-center w-12">#</th>
                                                <th className="px-4 py-3">Học sinh</th>
                                                <th className="px-4 py-3 text-center">Lớp</th>
                                                <th className="px-4 py-3 text-right">Điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {submissions.slice(0, 10).map((sub, index) => (
                                                <tr key={sub.id} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="px-4 py-3 text-center font-medium">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 font-medium">{sub.student?.full_name || "Ẩn danh"}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{sub.student?.class || "-"}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600">{sub.score.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Question Analysis */}
                        {selectedExam && (
                            <div className="lg:col-span-2">
                                <QuestionAnalysisTable
                                    data={analyzeQuestions(
                                        submissions.map(s => ({ student_answers: s.student_answers })),
                                        selectedExam.correct_answers
                                    )}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
