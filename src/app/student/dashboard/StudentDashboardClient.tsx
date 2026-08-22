"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Award,
  BookOpen,
  Clock,
  FileText,
  Search,
  Trophy,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { GradeOnboardingModal } from "@/components/student/GradeOnboardingModal"
import { ThptCountdown } from "@/components/shared/ThptCountdown"

import type { Exam, Submission } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export interface StudentDashboardClientProps {
  profile: {
    id: string
    full_name: string | null
    nickname: string | null
    class: string | null
    grade: number | null
    class_suffix: string | null
  } | null
  availableExams: Exam[]
  submissions: Pick<Submission, "exam_id" | "score" | "submitted_at">[]
  studentStats: { xp: number; level: number; streak_days: number; exams_completed: number; perfect_scores: number }
  classRank: number | null
  classSize: number | null
}

export function StudentDashboardClient({
  profile,
  availableExams,
  submissions,
  studentStats,
  classRank,
  classSize,
}: StudentDashboardClientProps) {
  const userXp = studentStats.xp
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const getExamTimeBadge = (exam: Exam) => {
    if (!exam.is_scheduled || !exam.start_time) {
      return { label: "Tự do", className: "bg-[var(--os-card-elevated)] text-[var(--os-muted)] border-[var(--os-border)]" }
    }
    const now = Date.now()
    const start = new Date(exam.start_time).getTime()
    const end = exam.end_time ? new Date(exam.end_time).getTime() : Infinity

    if (now > end) {
      return { label: "Quá hạn", className: "bg-red-500/10 text-red-500 border-red-500/20" }
    }

    const startDate = new Date(exam.start_time)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    const isToday = startDate.toDateString() === today.toDateString()
    const isTomorrow = startDate.toDateString() === tomorrow.toDateString()

    if (isToday) {
      return { label: "Hôm nay", className: "bg-[var(--os-accent)]/15 text-[var(--os-accent)] border-[var(--os-accent)]/30 animate-pulse" }
    }
    if (isTomorrow) {
      return { label: "Ngày mai", className: "bg-[var(--os-card-elevated)] text-[var(--os-fg)] border-[var(--os-border)]" }
    }
    return {
      label: startDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      className: "bg-[var(--os-bg)] text-[var(--os-muted)] border-[var(--os-border)]"
    }
  }

  const filteredExams = useMemo(() => {
    return availableExams.filter((exam) => {
      const matchSubject = selectedSubject === "all" || exam.subject === selectedSubject
      const matchSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSubject && matchSearch
    })
  }, [availableExams, searchQuery, selectedSubject])

  const hasSubmitted = (examId: string) => submissions.some((submission) => submission.exam_id === examId)
  const getSubmission = (examId: string) => submissions.find((submission) => submission.exam_id === examId)

  const unsubmittedExams = useMemo(() => {
    return availableExams.filter(exam => !hasSubmitted(exam.id))
  }, [availableExams, submissions])

  const submissionsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return submissions.filter(s => new Date(s.submitted_at) >= oneWeekAgo).length
  }, [submissions])

  const averageScore = useMemo(() => {
    if (submissions.length === 0) return "--"
    const total = submissions.reduce((acc, curr) => acc + (curr.score || 0), 0)
    return (total / submissions.length).toFixed(1)
  }, [submissions])

  const bestScore = useMemo(() => {
    if (submissions.length === 0) return "--"
    const max = Math.max(...submissions.map(s => s.score || 0))
    return max.toFixed(1)
  }, [submissions])

  return (
    <StudentShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {/* Topbar Component */}
      <StudentTopbar
        name={profile?.full_name}
        userXp={userXp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        nickname={profile?.nickname}
        studentClass={profile?.class}
      />

      {/* Navigation Tabs Component */}
      <StudentNavTabs />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">

        {/* Welcome Section */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-stretch">

          {/* Welcome Hero Card */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--os-accent)]" />
                  <span className={cn("text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--os-muted)]", jetbrainsMono.className)}>
                    {profile?.nickname === "X" ? "Dream Engine Edition" : "ExamHub Student Panel"}
                  </span>
                </div>

                <Link href="/student/exams">
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl border border-[var(--os-border)] text-[10px] font-bold hover:bg-[var(--os-bg)] text-[var(--os-muted)] hover:text-[var(--os-fg)] flex items-center gap-1 shrink-0">
                    <FileText className="h-3.5 w-3.5" /> Xem đề được giao
                  </Button>
                </Link>
              </div>
              <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
                {profile?.nickname === "X" ? "Chào mừng trở lại, X! 👋" : `Xin chào, ${profile?.full_name || "bạn"} 👋`}
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--os-muted)] italic max-w-xl">
                {profile?.nickname === "X"
                  ? '"Học nhi thời tập chi, bất diệc duyệt hồ? Học mà thường ôn tập, chẳng cũng vui lắm sao?" – Khổng Tử'
                  : '"Hành trình vạn dặm bắt đầu từ một bước chân. Mỗi câu hỏi đúng mang bạn đến gần hơn mục tiêu."'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#available-exams">
                <Button className="rounded-xl bg-[var(--os-accent)] hover:opacity-90 text-[var(--os-accent-fg)] font-semibold px-5 py-4 transition-all duration-200 shadow-sm">
                  {profile?.nickname === "X" ? "Làm đề giao riêng" : "Luyện tập ngay"}
                </Button>
              </a>
              <Link href="/student/analytics">
                <Button variant="outline" className="rounded-xl border-[var(--os-border)] hover:border-[var(--os-accent)] text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent px-5 py-4 transition-all">
                  Xem chi tiết tiến độ
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile / countdown card */}
          <div className="flex flex-col gap-4">
            <ThptCountdown className="flex-1" />
          </div>
        </section>

        {/* Row 2: KPI Metrics Cards */}
        <section className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Exams Completed */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-xl p-5 hover:border-[var(--os-accent)]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">📝 Đề đã làm</span>
              <FileText className="h-4 w-4 text-[var(--os-muted)]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[var(--os-fg)] mt-3">{submissions.length}</p>
            <p className="text-xs text-[var(--os-muted)] mt-1.5 font-medium font-mono">Tuần này: +{submissionsThisWeek}</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-xl p-5 hover:border-[var(--os-accent)]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">⭐ Điểm TB</span>
              <Trophy className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[var(--os-fg)] mt-3">{averageScore} <span className="text-lg font-normal text-[var(--os-muted)]">/10</span></p>
            <p className="text-xs text-[var(--os-muted)] mt-1.5 font-medium font-mono">Kỷ lục điểm: {bestScore}</p>
          </div>

          {/* Card 3: Class Rank */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-xl p-5 hover:border-[var(--os-accent)]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">🏆 Hạng lớp</span>
              <Award className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[var(--os-fg)] mt-3">
              {classRank !== null ? `#${classRank}` : "--"}{" "}
              <span className="text-lg font-normal text-[var(--os-muted)]">/{classSize ?? "--"}</span>
            </p>
            <p className="text-xs text-[var(--os-muted)] mt-1.5 font-medium">
              {classRank !== null && classSize ? `Top ${Math.round((classRank / classSize) * 100)}% của lớp` : "Đang tính..."}
            </p>
          </div>

          {/* Card 4: pending assignments */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-xl p-5 hover:border-[var(--os-accent)]/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">Đề chưa làm</span>
              <FileText className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[var(--os-fg)] mt-3">{unsubmittedExams.length}</p>
            <p className="text-xs text-[var(--os-muted)] mt-1.5 font-medium">Bài tập đang chờ hoàn thành</p>
          </div>
        </section>

        {/* Row 3: Main Layout Content Grid */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">

          {/* Left Panel: Assigned Exams */}
          <div className="space-y-8">

            {/* Assigned Exams Timeline */}
            <div id="available-exams" className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl overflow-hidden shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[var(--os-border)] p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className={cn("text-3xl text-[var(--os-fg)] font-normal", instrumentSerif.className)}>
                    {profile?.nickname === "X" ? "Nhiệm vụ đề thi của X" : "Đề thi có sẵn"}
                  </h2>
                  <p className="text-xs text-[var(--os-muted)] mt-1">
                    {profile?.nickname === "X" ? "Các đề thi độc quyền được giáo viên giao trực tiếp" : "Chọn đề thi và bắt đầu luyện tập"}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)] px-3 py-1.5 w-full max-w-xs">
                  <Search className="h-4 w-4 text-[var(--os-muted)]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={profile?.nickname === "X" ? "Tìm đề thi..." : "Tìm kiếm đề thi..."}
                    className="bg-transparent text-xs w-full outline-none text-[var(--os-fg)] placeholder-[var(--os-muted)]"
                  />
                </div>
              </div>

              {/* Subject Filters */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--os-border)] p-4">
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap border",
                    selectedSubject === "all"
                      ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-transparent shadow-sm"
                      : "border-[var(--os-border)] text-[var(--os-muted)] hover:border-[var(--os-accent)]"
                  )}
                >
                  Tất cả
                </button>
                {SUBJECTS.filter((subject) => availableExams.some((exam) => exam.subject === subject.value)).map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => setSelectedSubject(subject.value)}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap border",
                      selectedSubject === subject.value
                        ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-transparent shadow-sm"
                        : "border-[var(--os-border)] text-[var(--os-muted)] hover:border-[var(--os-accent)]"
                    )}
                  >
                    {subject.label}
                  </button>
                ))}
              </div>

              {/* Exams Listing */}
              {filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <FileText className="mb-4 h-12 w-12 text-[var(--os-muted)]/20" />
                  <h3 className="text-base font-semibold text-[var(--os-fg)]">Không tìm thấy đề thi phù hợp</h3>
                  <p className="mt-1 text-xs text-[var(--os-muted)] max-w-xs">Hãy đổi bộ lọc môn học hoặc từ khóa tìm kiếm.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--os-border)] bg-[var(--os-card)]">
                  {filteredExams.map((exam) => {
                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                    const submitted = hasSubmitted(exam.id)
                    const submission = getSubmission(exam.id)

                    return (
                      <div key={exam.id} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between hover:bg-[var(--os-bg)]/40 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--os-border)] bg-[var(--os-bg)]">
                            <span className="text-xl">{subjectInfo.icon}</span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-[var(--os-fg)]">{exam.title}</h3>
                              {submitted && submission && (
                                <span className={cn("rounded-lg border border-[var(--os-accent)]/40 bg-[var(--os-accent)]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[var(--os-accent)]", jetbrainsMono.className)}>
                                  {submission.score.toFixed(1)} ĐIỂM
                                </span>
                              )}
                              {profile?.nickname === "X" && (
                                <span className={cn("rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-wider whitespace-nowrap", getExamTimeBadge(exam).className)}>
                                  {getExamTimeBadge(exam).label.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className={cn("mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[var(--os-muted)]", jetbrainsMono.className)}>
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" />
                                {subjectInfo.label}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {exam.duration} phút
                              </span>
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3" />
                                {exam.total_questions} câu hỏi
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end lg:self-auto">
                          {submitted ? (
                            <>
                              <Link href={`/student/exams/${exam.id}/result`}>
                                <Button variant="outline" size="sm" className="rounded-lg border-[var(--os-border)] hover:border-[var(--os-accent)] text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent text-xs transition-colors">
                                  Xem kết quả
                                </Button>
                              </Link>
                              <Link href={`/student/exams/${exam.id}/take`}>
                                <Button size="sm" className="rounded-lg bg-[var(--os-accent)] hover:opacity-90 text-[var(--os-accent-fg)] font-semibold text-xs transition-colors">
                                  Làm lại
                                </Button>
                              </Link>
                            </>
                          ) : (
                            <Link href={`/student/exams/${exam.id}/take`}>
                              <Button size="sm" className="rounded-lg bg-[var(--os-accent)] hover:opacity-90 text-[var(--os-accent-fg)] font-semibold text-xs px-4 transition-colors">
                                Làm bài
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Quick Tools */}
          <div className="space-y-6">

            {/* Quick Navigation Tools */}
            <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-6 shadow-sm">
              <h3 className={cn("text-2xl text-[var(--os-fg)] font-normal mb-4", instrumentSerif.className)}>Công cụ làm bài</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/student/exams", label: "Đề thi được giao", icon: FileText },
                  { href: "/student/analytics", label: "Thống kê kết quả", icon: Trophy },
                  { href: "https://theieltsdictionary.com/", label: "Từ điển IELTS", icon: GraduationCap, isExternal: true },
                ].map((item) => {
                  const itemContent = (
                    <div className="flex flex-col justify-between p-3.5 h-20 bg-[var(--os-bg)] hover:bg-[var(--os-bg)]/80 border border-[var(--os-border)] hover:border-[var(--os-accent)]/50 rounded-xl transition-all duration-200 group">
                      <item.icon className="h-4.5 w-4.5 text-[var(--os-muted)] group-hover:text-[var(--os-accent)] transition-colors" />
                      <span className="text-xs font-semibold text-[var(--os-fg)]">{item.label}</span>
                    </div>
                  )
                  return item.isExternal ? (
                    <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                      {itemContent}
                    </a>
                  ) : (
                    <Link key={item.href} href={item.href}>
                      {itemContent}
                    </Link>
                  )
                })}
              </div>
            </div>

          </div>

        </section>

      </main>

      {profile && profile.grade === null && (
        <GradeOnboardingModal
          userId={profile.id}
          onComplete={() => {
            window.location.reload()
          }}
        />
      )}
    </StudentShell>
  )
}
