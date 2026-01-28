"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart3,
    FileSpreadsheet,
    FileText,
    Loader2,
    Users,
    Trophy,
    Target,
    TrendingDown,
    GraduationCap,
    Plus,
    LogOut,
    BookOpen,
    Swords,
    User
} from "lucide-react"
import { ScoreDistributionChart, generateScoreDistribution } from "@/components/analytics/ScoreDistributionChart"
import { QuestionAnalysisTable, analyzeQuestions } from "@/components/analytics/QuestionAnalysisTable"
import { exportAnalyticsToExcel } from "@/lib/excel-export"
import { StatsCard } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"

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
    const [fullName, setFullName] = useState("")
    const [stats, setStats] = useState({
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0
    })

    useEffect(() => {
        async function fetchExams() {
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

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
            {/* Sidebar - Fixed */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/teacher/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/teacher/exams/create"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Tạo đề mới
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quản lý</p>
                    </div>
                    <Link
                        href="/teacher/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <User className="w-5 h-5" />
                        Hồ sơ giáo viên
                    </Link>
                    <Link
                        href="/teacher/exam-bank"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Ngân hàng đề
                    </Link>
                    <Link
                        href="/teacher/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/teacher/analytics"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Thống kê chi tiết
                    </Link>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu
                        userName={fullName}
                        userClass="Giáo viên"
                        onLogout={handleLogout}
                        role="teacher"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-blue-600" />
                            Thống kê & Phân tích
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Phân tích chi tiết kết quả thi</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu
                            userName={fullName}
                            userClass="Giáo viên"
                            onLogout={handleLogout}
                            role="teacher"
                        />
                    </div>
                </div>

                {/* Filters & Actions */}
                <Card className="mb-6 border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Chọn đề thi:</span>
                                <select
                                    value={selectedExamId}
                                    onChange={(e) => setSelectedExamId(e.target.value)}
                                    className="w-full md:w-64 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            <Button variant="outline" onClick={handleExportExcel} disabled={submissions.length === 0} className="flex-1 md:flex-none border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportPDF} disabled={submissions.length === 0} className="flex-1 md:flex-none border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                                <FileText className="w-4 h-4 mr-2 text-red-600" />
                                In PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <StatsCard
                        label="Học sinh"
                        value={stats.totalStudents}
                        icon={Users}
                        iconColor={STAT_COLORS.blue.icon}
                        iconBgColor={STAT_COLORS.blue.bg}
                    />
                    <StatsCard
                        label="Điểm TB"
                        value={stats.averageScore.toFixed(1)}
                        icon={Target}
                        iconColor={STAT_COLORS.purple.icon}
                        iconBgColor={STAT_COLORS.purple.bg}
                    />
                    <StatsCard
                        label="Cao nhất"
                        value={stats.highestScore.toFixed(1)}
                        icon={Trophy}
                        iconColor={STAT_COLORS.yellow.icon}
                        iconBgColor={STAT_COLORS.yellow.bg}
                    />
                    <StatsCard
                        label="Thấp nhất"
                        value={stats.lowestScore.toFixed(1)}
                        icon={TrendingDown}
                        iconColor={STAT_COLORS.red.icon}
                        iconBgColor={STAT_COLORS.red.bg}
                    />
                    <StatsCard
                        label="Đạt (≥5)"
                        value={`${stats.passRate.toFixed(0)}%`}
                        icon={GraduationCap}
                        iconColor={STAT_COLORS.green.icon}
                        iconBgColor={STAT_COLORS.green.bg}
                    />
                </div>

                {exams.length === 0 ? (
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Chưa có dữ liệu</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
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
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Chưa có bài nộp</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Hãy chia sẻ đề thi để học sinh làm bài và xem kết quả tại đây.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution Chart */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-gray-800 dark:text-white">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Phân bố điểm số
                                </CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">Biểu đồ phổ điểm của học sinh</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScoreDistributionChart
                                    data={generateScoreDistribution(submissions.map(s => s.score))}
                                />
                            </CardContent>
                        </Card>

                        {/* Top Students Table */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-gray-800 dark:text-white">
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                    Bảng xếp hạng
                                </CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">Top 10 học sinh có điểm cao nhất</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-hidden rounded-md border border-gray-100 dark:border-slate-800 m-4 mt-0">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-slate-800">
                                            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                <th className="px-4 py-3 text-center w-12">#</th>
                                                <th className="px-4 py-3">Học sinh</th>
                                                <th className="px-4 py-3 text-center">Lớp</th>
                                                <th className="px-4 py-3 text-right">Điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                            {submissions.slice(0, 10).map((sub, index) => (
                                                <tr key={sub.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                                                    <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">
                                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{sub.student?.full_name || "Ẩn danh"}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{sub.student?.class || "-"}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{sub.score.toFixed(1)}</td>
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
            </main>

            {/* Mobile Bottom Nav */}
            <TeacherBottomNav />
        </div>
    )
}
