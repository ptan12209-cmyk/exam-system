"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/BottomNav"
import { getUserStats } from "@/lib/gamification"
import { cn } from "@/lib/utils"
import { ProgressLineChart } from "@/components/analytics/ProgressLineChart"
import { ActivityHeatmap, generateActivityData } from "@/components/analytics/ActivityHeatmap"
import { StrengthRadarChart, calculateStrengthBySubject } from "@/components/analytics/StrengthRadarChart"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Loading } from "@/components/shared/Loading"
import { Calendar, TrendingUp, Target, BarChart3, FileText } from "lucide-react"

import type { Submission } from "@/types"

interface StudentStats {
  xp: number
  level: number
  streak_days: number
  exams_completed: number
  perfect_scores: number
}

export default function StudentAnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState("")
  const [userClass, setUserClass] = useState("")
  const [userXp, setUserXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [summary, setSummary] = useState({ totalExams: 0, averageScore: 0, bestScore: 0, recentTrend: 0 })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      setUserClass(profile?.class || "")

      const { stats: userStats } = await getUserStats(user.id)
      setUserXp(userStats.xp)

      const { data: subsData } = await supabase.from("submissions").select("id, exam_id, score, submitted_at, exam:exams(id, title, subject)").eq("student_id", user.id).order("submitted_at", { ascending: true })
      if (subsData) {
        const transformed = subsData.map((submission: { id: string; exam_id: string; score: number; submitted_at: string; exam: { id: string; title: string; subject: string | null } | { id: string; title: string; subject: string | null }[] | null }) => ({ ...submission, exam: Array.isArray(submission.exam) ? submission.exam[0] : submission.exam })) as Submission[]
        setSubmissions(transformed)
        const scores = transformed.map((item) => item.score)
        if (scores.length > 0) {
          const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
          const bestScore = Math.max(...scores)
          const recentTrend = scores.length >= 10 ? scores.slice(-5).reduce((sum, score) => sum + score, 0) / 5 - scores.slice(-10, -5).reduce((sum, score) => sum + score, 0) / 5 : 0
          setSummary({ totalExams: scores.length, averageScore, bestScore, recentTrend })
        }
      }

      const { data: statsData } = await supabase.from("student_stats").select("*").eq("user_id", user.id).single()
      if (statsData) setStats(statsData)
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const progressData = submissions.map((submission) => ({ date: submission.submitted_at, score: submission.score, examTitle: submission.exam?.title }))
  const activityData = generateActivityData(submissions)
  const strengthData = calculateStrengthBySubject(submissions.map((submission) => ({ score: submission.score, exam: submission.exam ? { subject: submission.exam.subject || undefined } : undefined })))

  if (loading) return <Loading fullPage label="Đang phân tích kết quả..." />

  return (
    <StudentShell>
      <StudentHeader name={fullName} studentClass={userClass} onLogout={handleLogout} />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <TrendingUp className="h-3.5 w-3.5" /> Analytics
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight leading-tight md:text-6xl">
              Thống kê học tập
              <span className="mt-3 block max-w-2xl text-2xl font-normal not-italic leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-4xl">
                nhìn rõ tiến độ, nhìn đúng điểm mạnh.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Theo dõi nhịp học, kết quả và xu hướng làm bài trong một giao diện gọn, nhẹ và dễ đọc.
            </p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-6 shadow-sm">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p>
            <div className="mt-2 text-3xl font-semibold">{userXp}</div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
              <div className="h-full bg-[hsl(var(--foreground))]" style={{ width: `${Math.min(100, userXp % 100)}%` }} />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Bài thi</p>
            <div className="mt-2 flex items-end justify-between"><span className="text-3xl font-semibold">{summary.totalExams}</span><FileText className="h-5 w-5 opacity-60" /></div>
          </div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Điểm trung bình</p>
            <div className="mt-2 flex items-end justify-between"><span className="text-3xl font-semibold">{summary.averageScore.toFixed(1)}</span><Target className="h-5 w-5 opacity-60" /></div>
          </div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Xu hướng</p>
            <div className="mt-2 flex items-end justify-between"><span className={cn("text-3xl font-semibold", summary.recentTrend >= 0 ? "text-emerald-600" : "text-red-600")}>{summary.recentTrend >= 0 ? "+" : ""}{summary.recentTrend.toFixed(1)}</span><TrendingUp className={cn("h-5 w-5 opacity-60", summary.recentTrend >= 0 ? "text-emerald-600" : "text-red-600")} /></div>
          </div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">XP / cấp</p>
            <div className="mt-2 flex items-end justify-between"><span className="text-3xl font-semibold">Lv.{stats?.level || 1}</span><BarChart3 className="h-5 w-5 opacity-60" /></div>
          </div>
        </section>

        {submissions.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-12 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <BarChart3 className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold">Chưa có dữ liệu</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">Hoàn thành bài thi đầu tiên để hệ thống bắt đầu tạo biểu đồ và xu hướng.</p>
            <Link href="/student/exams" className="mt-6 inline-block">
              <Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">Xem đề thi</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-[hsl(var(--border))]/50 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5" /> Tiến bộ theo thời gian</h3>
              </div>
              <div className="p-5"><ProgressLineChart data={progressData} /></div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                <div className="border-b border-[hsl(var(--border))]/50 p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold"><Calendar className="h-5 w-5" /> Hoạt động 6 tháng</h3>
                </div>
                <div className="p-5"><ActivityHeatmap data={activityData} /></div>
              </div>

              {strengthData.length >= 3 && (
                <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                  <div className="border-b border-[hsl(var(--border))]/50 p-5">
                    <h3 className="flex items-center gap-2 text-lg font-semibold"><Target className="h-5 w-5" /> Điểm mạnh / điểm yếu</h3>
                  </div>
                  <div className="p-5"><StrengthRadarChart data={strengthData} /></div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-[hsl(var(--border))]/50 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><Calendar className="h-5 w-5" /> Lịch sử làm bài</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[hsl(var(--muted))]/30">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      <th className="px-6 py-4">Đề thi</th>
                      <th className="px-6 py-4">Ngày nộp</th>
                      <th className="px-6 py-4 text-right">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]/30">
                    {[...submissions].reverse().slice(0, 10).map((submission) => (
                      <tr key={submission.id} className="transition-colors hover:bg-[hsl(var(--muted))]/20">
                        <td className="px-6 py-4"><div className="font-medium">{submission.exam?.title || "Không xác định"}</div>{submission.exam?.subject && <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{submission.exam.subject}</div>}</td>
                        <td className="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">{new Date(submission.submitted_at).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-6 py-4 text-right"><span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-semibold", submission.score >= 8 ? "bg-emerald-100 text-emerald-700" : submission.score >= 5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{submission.score.toFixed(1)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </StudentShell>
  )
}
