"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
    User,
    ChevronRight
} from "lucide-react"
import { ScoreDistributionChart, generateScoreDistribution } from "@/components/analytics/ScoreDistributionChart"
import { QuestionAnalysisTable, analyzeQuestions } from "@/components/analytics/QuestionAnalysisTable"
import { exportAnalyticsToExcel } from "@/lib/excel-export"
import { StatsCard } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"
import { cn } from "@/lib/utils"
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
    const [stats, setStats] = useState({ totalStudents: 0, averageScore: 0, highestScore: 0, lowestScore: 0, passRate: 0 })

    useEffect(() => {
        async function fetchExams() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
            if (profile) setFullName(profile.full_name || "")
            const { data: examsData } = await supabase.from("exams").select("id, title, total_questions, correct_answers").eq("teacher_id", user.id).eq("status", "published").order("created_at", { ascending: false })
            if (examsData && examsData.length > 0) { setExams(examsData); setSelectedExamId(examsData[0].id) }
            setLoading(false)
        }
        fetchExams()
    }, [router, supabase])

    useEffect(() => {
        async function fetchSubmissions() {
            if (!selectedExamId) return
            const { data: subsData } = await supabase.from("submissions").select(`id, exam_id, score, student_answers, submitted_at, student:profiles!student_id(full_name, class)`).eq("exam_id", selectedExamId).order("score", { ascending: false })
            if (subsData) {
                const transformedData = subsData.map((sub: {
                    id: string; exam_id: string; score: number; student_answers: string[]; submitted_at: string
                    student: { full_name: string | null; class: string | null } | { full_name: string | null; class: string | null }[] | null
                }) => ({ ...sub, student: Array.isArray(sub.student) ? sub.student[0] : sub.student })) as Submission[]
                setSubmissions(transformedData)
                const scores = transformedData.map(s => s.score)
                if (scores.length > 0) {
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
                    const passing = scores.filter(s => s >= 5).length
                    setStats({ totalStudents: scores.length, averageScore: avg, highestScore: Math.max(...scores), lowestScore: Math.min(...scores), passRate: (passing / scores.length) * 100 })
                } else { setStats({ totalStudents: 0, averageScore: 0, highestScore: 0, lowestScore: 0, passRate: 0 }) }
            }
        }
        fetchSubmissions()
    }, [selectedExamId, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
    const selectedExam = exams.find(e => e.id === selectedExamId)

    const handleExportExcel = () => {
        if (!selectedExam || submissions.length === 0) return
        exportAnalyticsToExcel({ examTitle: selectedExam.title, submissions: submissions.map(s => ({ studentName: s.student?.full_name || "Ẩn danh", className: s.student?.class || "-", score: s.score, submittedAt: s.submitted_at })), stats })
    }
    const handleExportPDF = () => { window.print() }

    const NAV_ITEMS = [
        { href: "/teacher/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus },
    ]
    const MANAGE_ITEMS = [
        { href: "/teacher/profile", label: "Hồ sơ giáo viên", icon: User },
        { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: BookOpen },
        { href: "/teacher/arena", label: "Đấu trường", icon: Swords },
        { href: "/teacher/analytics", label: "Thống kê chi tiết", icon: BarChart3, active: true },
    ]

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 glass-sidebar p-5 hidden lg:flex lg:flex-col z-50">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-foreground">ExamHub</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}

                    <div className="pt-5 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản lý</p>
                    </div>

                    {MANAGE_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}
                </nav>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                </div>
            </header>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-indigo-500" />
                            Thống kê & Phân tích
                        </h1>
                        <p className="text-muted-foreground">Phân tích chi tiết kết quả thi</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="glass-card rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">Chọn đề thi:</span>
                            <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}
                                className="w-full md:w-64 px-3 py-2 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                                {exams.map((exam) => (<option key={exam.id} value={exam.id}>{exam.title}</option>))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" onClick={handleExportExcel} disabled={submissions.length === 0} className="flex-1 md:flex-none border-border text-muted-foreground hover:text-foreground">
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />Excel
                        </Button>
                        <Button variant="outline" onClick={handleExportPDF} disabled={submissions.length === 0} className="flex-1 md:flex-none border-border text-muted-foreground hover:text-foreground">
                            <FileText className="w-4 h-4 mr-2 text-red-500" />In PDF
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <StatsCard label="Học sinh" value={stats.totalStudents} icon={Users} iconColor={STAT_COLORS.blue.icon} iconBgColor={STAT_COLORS.blue.bg} />
                    <StatsCard label="Điểm TB" value={stats.averageScore.toFixed(1)} icon={Target} iconColor={STAT_COLORS.purple.icon} iconBgColor={STAT_COLORS.purple.bg} />
                    <StatsCard label="Cao nhất" value={stats.highestScore.toFixed(1)} icon={Trophy} iconColor={STAT_COLORS.yellow.icon} iconBgColor={STAT_COLORS.yellow.bg} />
                    <StatsCard label="Thấp nhất" value={stats.lowestScore.toFixed(1)} icon={TrendingDown} iconColor={STAT_COLORS.red.icon} iconBgColor={STAT_COLORS.red.bg} />
                    <StatsCard label="Đạt (≥5)" value={`${stats.passRate.toFixed(0)}%`} icon={GraduationCap} iconColor={STAT_COLORS.green.icon} iconBgColor={STAT_COLORS.green.bg} />
                </div>

                {exams.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Chưa có dữ liệu</h3>
                        <p className="text-muted-foreground mb-6">Tạo đề thi và xuất bản để bắt đầu xem thống kê.</p>
                        <Link href="/teacher/exams/create">
                            <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">Tạo đề thi mới</Button>
                        </Link>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Chưa có bài nộp</h3>
                        <p className="text-muted-foreground">Hãy chia sẻ đề thi để học sinh làm bài và xem kết quả tại đây.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><BarChart3 className="w-5 h-5 text-indigo-500" />Phân bố điểm số</h3>
                                <p className="text-muted-foreground text-sm">Biểu đồ phổ điểm của học sinh</p>
                            </div>
                            <div className="p-5"><ScoreDistributionChart data={generateScoreDistribution(submissions.map(s => s.score))} /></div>
                        </div>

                        {/* Top Students */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground"><Trophy className="w-5 h-5 text-amber-500" />Bảng xếp hạng</h3>
                                <p className="text-muted-foreground text-sm">Top 10 học sinh có điểm cao nhất</p>
                            </div>
                            <div className="p-4 pt-0">
                                <div className="overflow-hidden rounded-xl border border-border/30 mt-4">
                                    <table className="w-full">
                                        <thead className="bg-muted/30">
                                            <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                <th className="px-4 py-3 text-center w-12">#</th>
                                                <th className="px-4 py-3">Học sinh</th>
                                                <th className="px-4 py-3 text-center">Lớp</th>
                                                <th className="px-4 py-3 text-right">Điểm</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {submissions.slice(0, 10).map((sub, index) => (
                                                <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-3 text-center font-medium text-foreground">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
                                                    <td className="px-4 py-3 text-foreground font-medium">{sub.student?.full_name || "Ẩn danh"}</td>
                                                    <td className="px-4 py-3 text-center text-muted-foreground">{sub.student?.class || "-"}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{sub.score.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Question Analysis */}
                        {selectedExam && (
                            <div className="lg:col-span-2">
                                <QuestionAnalysisTable data={analyzeQuestions(submissions.map(s => ({ student_answers: s.student_answers })), selectedExam.correct_answers)} />
                            </div>
                        )}
                    </div>
                )}
            </main>

            <TeacherBottomNav />
        </div>
    )
}
