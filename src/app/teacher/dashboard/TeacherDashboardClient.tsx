"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import {
  BarChart3, FileText, Users, Clock, Plus,
  ArrowRight, Award
} from "lucide-react"

// Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts"

import type { Exam } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export interface DashboardSubmission {
  id: string
  exam_id: string
  score: number
  submitted_at: string
  student_id: string
  student: { full_name: string | null; class: string | null; avatar_url: string | null } | null
  exam: { title: string; subject: string } | null
}

export interface TeacherDashboardClientProps {
  fullName: string
  exams: Exam[]
  submissions: DashboardSubmission[]
  totalStudents: number
  stats: {
    examsCreatedThisWeek: number
    newSubmissionsCount: number
    activeStudentsThisWeek: number
    activeStudentsPercent: number
    averageScore: number
  }
  dailyActivityData: { name: string; "Lượt nộp": number; "Học sinh": number }[]
  scoreDistribution: { name: string; value: number; color: string }[]
}

export function TeacherDashboardClient({
  fullName,
  exams,
  submissions,
  totalStudents,
  stats,
  dailyActivityData,
  scoreDistribution,
}: TeacherDashboardClientProps) {
  const recentExams = exams.slice(0, 5)
  const recentSubmissions = submissions.slice(0, 5)

  const formatTimeSpent = (dateStr?: string) => {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Vừa xong"
    if (minutes < 60) return `${minutes} phút trước`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} giờ trước`
    return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  }

  return (
    <TeacherShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--os-muted)]/20 bg-[var(--os-bg)]/90 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--os-muted)]/20">
              <BarChart3 className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <span className="text-lg font-bold tracking-tighter">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={fullName} userClass="Giáo viên" role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">

        {/* Title Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-card)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <BarChart3 className="h-3.5 w-3.5 text-[var(--os-accent)]" /> Teacher Overview
            </p>
            <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Xin chào, {fullName || "Thầy/Cô"}
              <span className="mt-2 block max-w-2xl font-serif-italic text-2xl md:text-3xl text-[var(--os-muted)]">
                không gian giám sát & phân tích học tập tinh gọn.
              </span>
            </h1>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="flex items-center gap-3 justify-end">
            <Link href="/teacher/exams/create">
              <Button className="rounded-xl bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] px-5 py-5 text-xs font-bold shadow-md">
                <Plus className="mr-2 h-4 w-4 shrink-0" strokeWidth={2.5} /> Soạn đề thi mới
              </Button>
            </Link>
          </div>
        </section>

        {/* Row 1 — 4 KPI Cards */}
        <section className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

          {/* KPI 1 */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-5 hover:border-[var(--os-accent)]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">📝 Đề thi đã tạo</span>
              <FileText className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[var(--os-fg)]", jetbrainsMono.className)}>
              {exams.length}
            </div>
            <p className="mt-1 text-[10px] text-emerald-400 font-mono">
              +{stats.examsCreatedThisWeek} đề mới tuần này
            </p>
          </div>

          {/* KPI 2 */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-5 hover:border-[var(--os-accent)]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">📬 Bài nộp chưa xem</span>
              <Clock className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[var(--os-fg)]", jetbrainsMono.className)}>
              {stats.newSubmissionsCount}
            </div>
            <p className="mt-1 text-[10px] text-amber-400 font-mono">
              {stats.newSubmissionsCount} bài nộp mới 24h qua
            </p>
          </div>

          {/* KPI 3 */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-5 hover:border-[var(--os-accent)]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">👥 Học sinh hoạt động</span>
              <Users className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[var(--os-fg)]", jetbrainsMono.className)}>
              {stats.activeStudentsThisWeek}
            </div>
            <p className="mt-1 text-[10px] text-[var(--os-accent)] font-mono">
              {stats.activeStudentsPercent}% tương tác tích cực
            </p>
          </div>

          {/* KPI 4: total students */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-5 hover:border-[var(--os-accent)]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">🏫 Tổng học sinh</span>
              <Users className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[var(--os-fg)]", jetbrainsMono.className)}>
              {totalStudents}
            </div>
            <p className="mt-1 text-[10px] text-emerald-400 font-mono">
              Toàn hệ thống
            </p>
          </div>

        </section>

        {/* Row 2 — Charts (7-Day Line & Score distribution Pie) */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">

          {/* Left Chart: Activity 7 Days */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-6">
            <h3 className="text-sm font-bold text-[var(--os-fg)] mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--os-accent)]" /> Hoạt động làm bài (7 ngày qua)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--os-muted)" opacity={0.08} />
                  <XAxis dataKey="name" stroke="var(--os-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--os-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--os-card)",
                      borderColor: "rgba(140, 135, 162, 0.2)",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "var(--os-fg)", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: "var(--os-fg)", fontSize: "11px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line name="Lượt nộp bài" type="monotone" dataKey="Lượt nộp" stroke="var(--os-accent)" strokeWidth={2.5} activeDot={{ r: 5 }} />
                  <Line name="Học sinh tương tác" type="monotone" dataKey="Học sinh" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart: Score Distribution Pie */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-6 relative flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--os-fg)] mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-[var(--os-accent)]" /> Phân phối điểm số bài nộp
              </h3>
            </div>

            {scoreDistribution.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center my-auto">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scoreDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Donut Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-[var(--os-muted)] uppercase tracking-wider font-mono">Điểm TB</span>
                    <span className="text-2xl font-bold font-mono text-[var(--os-fg)]">{stats.averageScore}</span>
                  </div>
                </div>

                {/* Score Legends */}
                <div className="space-y-2 flex-1 w-full text-xs">
                  {scoreDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--os-muted)]">{item.name}</span>
                      </div>
                      <span className="font-bold font-mono text-[var(--os-fg)]">{item.value} bài</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-[var(--os-muted)] italic my-auto">
                Chưa có dữ liệu bài nộp nào để hiển thị biểu đồ phân bố điểm.
              </div>
            )}
          </div>
        </section>

        {/* Row 3 — Lists Section (Recent Exams & Recent Submissions 1:1) */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* Column 1: Recent Exams */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[var(--os-muted)]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[var(--os-fg)] flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[var(--os-accent)]" /> Đề thi soạn gần đây
              </h3>
              <Link href="/teacher/exams" className="text-xs text-[var(--os-accent)] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentExams.length > 0 ? (
              <div className="space-y-3.5">
                {recentExams.map((exam) => {
                  const subjectInfo = getSubjectInfo(exam.subject || "other")
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--os-bg)] border border-[var(--os-muted)]/15">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--os-muted)]/20 bg-[var(--os-card)] text-lg">
                          {subjectInfo.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--os-fg)] truncate max-w-[160px]">{exam.title}</span>
                            <span className={cn(
                              "text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              exam.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {exam.status === "published" ? "Phát hành" : "Nháp"}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-[var(--os-muted)] flex items-center gap-2">
                            <span>{exam.duration} phút</span>
                            <span>•</span>
                            <span>{exam.total_questions} câu</span>
                          </div>
                        </div>
                      </div>

                      <Link href={`/teacher/exams/${exam.id}/scores`}>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg border-[var(--os-muted)]/30 text-[10px] font-bold bg-transparent text-[var(--os-muted)] hover:text-[var(--os-accent)] hover:border-[var(--os-accent)]">
                          Xem
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[var(--os-muted)] italic">
                Thầy/Cô chưa tạo đề thi nào.
              </div>
            )}
          </div>

          {/* Column 2: Recent Submissions */}
          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[var(--os-muted)]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[var(--os-fg)] flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[var(--os-accent)]" /> Lượt nộp bài mới nhất
              </h3>
              <Link href="/teacher/analytics" className="text-xs text-[var(--os-accent)] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentSubmissions.length > 0 ? (
              <div className="space-y-3.5">
                {recentSubmissions.map((sub) => {
                  const hasAvatar = !!sub.student?.avatar_url
                  const initials = sub.student?.full_name?.charAt(0).toUpperCase() || "?"
                  return (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--os-bg)] border border-[var(--os-muted)]/15">
                      <div className="flex items-center gap-3 min-w-0">
                        {hasAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sub.student!.avatar_url!} alt="Avatar" className="h-9 w-9 shrink-0 rounded-lg border border-[var(--os-muted)]/20 object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--os-muted)]/20 bg-[var(--os-card)] text-xs font-bold text-[var(--os-accent)]">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--os-fg)] truncate max-w-[120px]">{sub.student?.full_name || "Ẩn danh"}</span>
                            {sub.student?.class && (
                              <span className="text-[9px] font-mono bg-[var(--os-muted)]/10 text-[var(--os-muted)] px-1.5 py-0.5 rounded">
                                Lớp {sub.student.class}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-[var(--os-muted)] truncate max-w-[180px]" title={sub.exam?.title}>
                            Đề: {sub.exam?.title || "Không rõ"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-[var(--os-accent)]">{sub.score.toFixed(1)}</span>
                        <p className="text-[8px] text-[var(--os-muted)] mt-0.5 font-mono">
                          {formatTimeSpent(sub.submitted_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[var(--os-muted)] italic">
                Chưa có lượt nộp bài thi nào.
              </div>
            )}
          </div>
        </section>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
