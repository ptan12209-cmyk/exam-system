"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ScoreDistributionChart, generateScoreDistribution } from "@/components/analytics/ScoreDistributionChart"
import { QuestionAnalysisTable, analyzeQuestions } from "@/components/analytics/QuestionAnalysisTable"
import { exportAnalyticsToExcel } from "@/lib/excel-export"
import { StatsCard } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { BarChart3, FileSpreadsheet, Users, Trophy, Target, TrendingDown, GraduationCap, Download } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

interface Exam { id: string; title: string; total_questions: number; correct_answers: string[] }
interface Submission { id: string; exam_id: string; score: number; student_answers: string[]; submitted_at: string; student: { full_name: string | null; class: string | null } }

export default function TeacherAnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [fullName, setFullName] = useState("")
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all")
  const [stats, setStats] = useState({ totalStudents: 0, averageScore: 0, highestScore: 0, lowestScore: 0, passRate: 0 })

  const filteredSubmissions = useMemo(() => {
    if (timeRange === "all") return submissions
    const days = timeRange === "7d" ? 7 : 30
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return submissions.filter((s) => new Date(s.submitted_at) >= cutoff)
  }, [submissions, timeRange])

  useEffect(() => {
    const scores = filteredSubmissions.map((s) => s.score)
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const passing = scores.filter((s) => s >= 5).length
      setStats({ totalStudents: scores.length, averageScore: avg, highestScore: Math.max(...scores), lowestScore: Math.min(...scores), passRate: (passing / scores.length) * 100 })
    } else {
      setStats({ totalStudents: 0, averageScore: 0, highestScore: 0, lowestScore: 0, passRate: 0 })
    }
  }, [filteredSubmissions])

  useEffect(() => {
    async function fetchExams() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      if (profile) setFullName(profile.full_name || "")
      const { data: examsData } = await supabase.from("exams").select("id, title, total_questions, correct_answers").eq("teacher_id", user.id).eq("status", "published").order("created_at", { ascending: false })
      if (examsData?.length) { setExams(examsData); setSelectedExamId(examsData[0].id) }
      setLoading(false)
    }
    fetchExams()
  }, [router, supabase])

  useEffect(() => {
    async function fetchSubmissions() {
      if (!selectedExamId) return
      const { data: subsData } = await supabase.from("submissions").select(`id, exam_id, score, student_answers, submitted_at, student:profiles!student_id(full_name, class)`).eq("exam_id", selectedExamId).order("score", { ascending: false })
      if (subsData) setSubmissions(subsData.map((sub: Submission) => ({ ...sub, student: Array.isArray((sub as unknown as { student: unknown }).student) ? ((sub as unknown as { student: { full_name: string | null; class: string | null }[] }).student[0]) : sub.student })))
    }
    fetchSubmissions()
  }, [selectedExamId, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const selectedExam = exams.find((e) => e.id === selectedExamId)
  const handleExportExcel = () => { if (selectedExam && submissions.length > 0) exportAnalyticsToExcel({ examTitle: selectedExam.title, submissions: submissions.map((s) => ({ studentName: s.student?.full_name || "Ẩn danh", className: s.student?.class || "-", score: s.score, submittedAt: s.submitted_at })), stats }) }

  if (loading) return <Loading fullPage label="Đang phân tích dữ liệu..." />

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/75 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60"><BarChart3 className="h-4 w-4" /></div>
            <span className="text-lg font-semibold tracking-tight">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2"><NotificationBell /><UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" /></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"><BarChart3 className="h-3.5 w-3.5" /> Analytics</p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight leading-tight md:text-6xl">
              Thống kê & phân tích
              <span className="mt-3 block max-w-2xl text-2xl font-normal not-italic leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-4xl">
                nhìn rõ phổ điểm và câu hỏi cần cải thiện.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">Theo dõi phổ điểm, hiệu suất làm bài và những câu hỏi cần cải thiện.</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-6 shadow-sm">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Số học sinh</p>
            <div className="mt-2 text-3xl font-semibold">{stats.totalStudents}</div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Điểm trung bình {stats.averageScore.toFixed(1)}</p>
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Chọn đề thi:</span><select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></div>
            <div className="flex items-center gap-2"><span className="text-sm font-medium">Khoảng thời gian:</span><select value={timeRange} onChange={(e) => setTimeRange(e.target.value as "7d" | "30d" | "all")} className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm"><option value="7d">7 ngày qua</option><option value="30d">30 ngày qua</option><option value="all">Tất cả</option></select></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={submissions.length === 0} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"><FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />Excel</Button>
            <Button variant="outline" onClick={() => window.print()} disabled={submissions.length === 0} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"><Download className="mr-2 h-4 w-4 text-red-500" />In PDF</Button>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatsCard label="Học sinh" value={stats.totalStudents} icon={Users} iconColor={STAT_COLORS.blue.icon} iconBgColor={STAT_COLORS.blue.bg} />
          <StatsCard label="Điểm TB" value={stats.averageScore.toFixed(1)} icon={Target} iconColor={STAT_COLORS.purple.icon} iconBgColor={STAT_COLORS.purple.bg} />
          <StatsCard label="Cao nhất" value={stats.highestScore.toFixed(1)} icon={Trophy} iconColor={STAT_COLORS.yellow.icon} iconBgColor={STAT_COLORS.yellow.bg} />
          <StatsCard label="Thấp nhất" value={stats.lowestScore.toFixed(1)} icon={TrendingDown} iconColor={STAT_COLORS.red.icon} iconBgColor={STAT_COLORS.red.bg} />
          <StatsCard label="Đạt (≥5)" value={`${stats.passRate.toFixed(0)}%`} icon={GraduationCap} iconColor={STAT_COLORS.green.icon} iconBgColor={STAT_COLORS.green.bg} />
        </section>

        {!exams.length ? <div className="mt-10 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-12 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]"><BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-30" /><h3 className="text-lg font-semibold">Chưa có dữ liệu</h3><p className="mt-2 text-[hsl(var(--muted-foreground))]">Tạo và phát hành đề thi để bắt đầu xem thống kê.</p></div> : !submissions.length ? <div className="mt-10 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-12 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]"><Users className="mx-auto mb-4 h-12 w-12 opacity-30" /><h3 className="text-lg font-semibold">Chưa có bài nộp</h3><p className="mt-2 text-[hsl(var(--muted-foreground))]">Hãy chia sẻ đề thi để học sinh làm bài.</p></div> : <div className="mt-10 grid gap-6 lg:grid-cols-2"><div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]"><div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-5 w-5" /> Phân bố điểm số</h3><p className="text-sm text-[hsl(var(--muted-foreground))]">Biểu đồ phổ điểm của học sinh</p></div><div className="p-5"><ScoreDistributionChart data={generateScoreDistribution(filteredSubmissions.map((s) => s.score))} /></div></div><div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]"><div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-5 w-5" /> Bảng xếp hạng</h3><p className="text-sm text-[hsl(var(--muted-foreground))]">Top 10 học sinh có điểm cao nhất</p></div><div className="p-4 pt-0"><div className="mt-4 overflow-hidden rounded-xl border border-[hsl(var(--border))]/30"><table className="w-full"><thead className="bg-[hsl(var(--muted))]/30"><tr className="text-left text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><th className="w-12 px-4 py-3 text-center">#</th><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3 text-center">Lớp</th><th className="px-4 py-3 text-right">Điểm</th></tr></thead><tbody className="divide-y divide-[hsl(var(--border))]/30">{filteredSubmissions.slice(0, 10).map((sub, index) => <tr key={sub.id} className="transition-colors hover:bg-[hsl(var(--muted))]/20"><td className="px-4 py-3 text-center font-medium">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td><td className="px-4 py-3 font-medium">{sub.student?.full_name || "Ẩn danh"}</td><td className="px-4 py-3 text-center text-[hsl(var(--muted-foreground))]">{sub.student?.class || "-"}</td><td className="px-4 py-3 text-right font-bold text-[hsl(var(--foreground))]">{sub.score.toFixed(1)}</td></tr>)}</tbody></table></div></div></div>{selectedExam && filteredSubmissions.length > 0 && <div className="lg:col-span-2"><QuestionAnalysisTable data={analyzeQuestions(filteredSubmissions.map((s) => ({ student_answers: s.student_answers })), selectedExam.correct_answers)} /></div>}</div>}
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
