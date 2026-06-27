"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { getUserStats } from "@/lib/gamification"
import { cn } from "@/lib/utils"
import { ProgressLineChart } from "@/components/analytics/ProgressLineChart"
import { ActivityHeatmap, generateActivityData } from "@/components/analytics/ActivityHeatmap"
import { StrengthRadarChart, calculateStrengthBySubject } from "@/components/analytics/StrengthRadarChart"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
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

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

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
  
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      setUserClass(profile?.class || "")

      const { stats: userStats } = await getUserStats(user.id)
      setStudentStats(userStats)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }
  
  const progressData = submissions.map((submission) => ({ date: submission.submitted_at, score: submission.score, examTitle: submission.exam?.title }))
  const activityData = generateActivityData(submissions)
  const strengthData = calculateStrengthBySubject(submissions.map((submission) => ({ score: submission.score, exam: submission.exam ? { subject: submission.exam.subject || undefined } : undefined })))

  const xpProgress = useMemo(() => {
    const currentLevel = studentStats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = userXp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [studentStats.level, userXp])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang phân tích kết quả..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={userXp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Title Section */}
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#8C87A2]">
              <TrendingUp className="h-3.5 w-3.5 text-[#C18CFF]" /> Analytics
            </p>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Thống kê học tập
              <span className="mt-2 block max-w-2xl text-2xl sm:text-3xl text-[#8C87A2] leading-tight tracking-normal italic">
                nhìn rõ tiến độ, nhìn đúng điểm mạnh.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#8C87A2]">
              Theo dõi nhịp học, kết quả và xu hướng làm bài trong một giao diện gọn, nhẹ và dễ đọc.
            </p>
          </div>

          {/* XP progress card */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-[#8C87A2] font-mono">XP HIỆN TẠI</p>
            <div className="mt-2 text-3xl font-bold text-[#F1EDF9]">{userXp} XP</div>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF] transition-all duration-700 ease-out" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8C87A2] font-mono">
                <span>Cấp {studentStats.level}</span>
                <span>Còn {xpProgress.nextTotal - userXp} XP lên cấp {studentStats.level + 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Stats Cards */}
        <section className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <p className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Bài thi đã làm</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-[#F1EDF9] tracking-tight">{summary.totalExams}</span>
              <FileText className="h-4 w-4 text-[#8C87A2]" />
            </div>
          </div>
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <p className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Điểm trung bình</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-[#F1EDF9] tracking-tight">{summary.averageScore.toFixed(1)}</span>
              <Target className="h-4 w-4 text-[#C18CFF]" />
            </div>
          </div>
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <p className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Xu hướng</p>
            <div className="mt-3 flex items-end justify-between">
              <span className={cn("text-3xl font-bold tracking-tight font-mono", summary.recentTrend >= 0 ? "text-emerald-400" : "text-red-400")}>
                {summary.recentTrend >= 0 ? "+" : ""}{summary.recentTrend.toFixed(1)}
              </span>
              <TrendingUp className={cn("h-4 w-4", summary.recentTrend >= 0 ? "text-emerald-400" : "text-red-400")} />
            </div>
          </div>
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <p className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Cấp độ hiện tại</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-[#F1EDF9] tracking-tight">Lv.{stats?.level || 1}</span>
              <BarChart3 className="h-4 w-4 text-[#C18CFF]" />
            </div>
          </div>
        </section>

        {/* Dynamic Charts and tables */}
        {submissions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#8C87A2]/25 bg-[#0B0A13]">
              <BarChart3 className="h-8 w-8 text-[#8C87A2] opacity-50" />
            </div>
            <h3 className="text-base font-bold text-[#F1EDF9]">Chưa có dữ liệu</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs text-[#8C87A2] leading-relaxed">Hoàn thành bài thi đầu tiên để hệ thống bắt đầu tạo biểu đồ và xu hướng.</p>
            <Link href="/student/exams" className="mt-6 inline-block">
              <Button className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold px-6 py-2.5">Xem đề thi</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            
            {/* Line progress chart */}
            <div className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] shadow-sm">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]"><TrendingUp className="h-5 w-5 text-[#C18CFF]" /> Tiến bộ theo thời gian</h3>
              </div>
              <div className="p-5">
                <ProgressLineChart data={progressData} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Heatmap activities */}
              <div className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] shadow-sm">
                <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                  <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]"><Calendar className="h-5 w-5 text-[#C18CFF]" /> Hoạt động 6 tháng</h3>
                </div>
                <div className="p-5">
                  <ActivityHeatmap data={activityData} />
                </div>
              </div>

              {/* Radar chart strengths */}
              {strengthData.length >= 3 && (
                <div className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] shadow-sm">
                  <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                    <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]"><Target className="h-5 w-5 text-[#C18CFF]" /> Điểm mạnh / điểm yếu</h3>
                  </div>
                  <div className="p-5">
                    <StrengthRadarChart data={strengthData} />
                  </div>
                </div>
              )}
            </div>

            {/* History Table */}
            <div className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] shadow-sm">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]"><Calendar className="h-5 w-5 text-[#C18CFF]" /> Lịch sử làm bài</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0B0A13] border-b border-[#8C87A2]/20">
                    <tr className="text-xs font-bold uppercase tracking-[0.2em] text-[#8C87A2] font-mono">
                      <th className="px-6 py-4">Đề thi</th>
                      <th className="px-6 py-4">Ngày nộp</th>
                      <th className="px-6 py-4 text-right">Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8C87A2]/10 bg-[#15131F]">
                    {[...submissions].reverse().slice(0, 10).map((submission) => (
                      <tr key={submission.id} className="transition-colors hover:bg-[#0B0A13]/40">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#F1EDF9]">{submission.exam?.title || "Không xác định"}</div>
                          {submission.exam?.subject && <div className="mt-1 text-xs text-[#8C87A2] font-mono uppercase">{submission.exam.subject}</div>}
                        </td>
                        <td className="px-6 py-4 text-xs text-[#8C87A2] font-mono">{new Date(submission.submitted_at).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" })}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn("inline-flex rounded-lg px-2.5 py-1 text-xs font-bold font-mono border", 
                            submission.score >= 8 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : submission.score >= 5 
                              ? "bg-[#C18CFF]/15 text-[#C18CFF] border-[#C18CFF]/20" 
                              : "bg-red-500/10 text-red-400 border-red-500/20")}>
                            {submission.score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </StudentShell>
  )
}
