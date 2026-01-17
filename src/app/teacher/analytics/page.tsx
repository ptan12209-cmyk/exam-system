"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Target
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { ScoreDistributionChart, generateScoreDistribution } from "@/components/analytics/ScoreDistributionChart"
import { QuestionAnalysisTable, analyzeQuestions } from "@/components/analytics/QuestionAnalysisTable"
import { exportAnalyticsToExcel } from "@/lib/excel-export"

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
        // Use browser print for PDF
        window.print()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card sticky top-0 z-50 safe-top">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/teacher/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">Thống kê & Phân tích</h1>
                                    <p className="text-sm text-muted-foreground">Phân tích kết quả thi</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Exam Selector & Export */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Chọn đề thi:</label>
                        <select
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-ring"
                        >
                            {exams.map((exam) => (
                                <option key={exam.id} value={exam.id}>
                                    {exam.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportExcel} disabled={submissions.length === 0}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} disabled={submissions.length === 0}>
                            <FileText className="w-4 h-4 mr-2" />
                            In PDF
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Users className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.totalStudents}</div>
                            <div className="text-xs text-muted-foreground">Học sinh</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Target className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Điểm TB</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.highestScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Cao nhất</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <div className="w-6 h-6 mx-auto text-red-500 mb-2 font-bold">↓</div>
                            <div className="text-2xl font-bold">{stats.lowestScore.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Thấp nhất</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <GraduationCap className="w-6 h-6 mx-auto text-green-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.passRate.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">Đạt (≥5)</div>
                        </CardContent>
                    </Card>
                </div>

                {exams.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có đề thi</h3>
                            <p className="text-muted-foreground mb-4">
                                Tạo và publish đề thi để xem thống kê
                            </p>
                            <Link href="/teacher/exams/create">
                                <Button>Tạo đề thi</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : submissions.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Chưa có bài nộp</h3>
                            <p className="text-muted-foreground">
                                Chia sẻ đề thi để học sinh làm bài
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Score Distribution Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Phân bố điểm số
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScoreDistributionChart
                                    data={generateScoreDistribution(submissions.map(s => s.score))}
                                />
                            </CardContent>
                        </Card>

                        {/* Question Analysis */}
                        {selectedExam && (
                            <QuestionAnalysisTable
                                data={analyzeQuestions(
                                    submissions.map(s => ({ student_answers: s.student_answers })),
                                    selectedExam.correct_answers
                                )}
                            />
                        )}

                        {/* Top Students Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5" />
                                    Bảng xếp hạng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left text-sm">
                                                <th className="px-4 py-3 font-medium">#</th>
                                                <th className="px-4 py-3 font-medium">Học sinh</th>
                                                <th className="px-4 py-3 font-medium">Lớp</th>
                                                <th className="px-4 py-3 font-medium text-right">Điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {submissions.slice(0, 10).map((sub, index) => (
                                                <tr key={sub.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 font-medium">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">{sub.student?.full_name || "Ẩn danh"}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{sub.student?.class || "-"}</td>
                                                    <td className="px-4 py-3 text-right font-medium">{sub.score.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    )
}
