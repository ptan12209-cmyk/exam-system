"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  GraduationCap,
  Search,
  Swords,
  Trophy,
  Zap,
  CheckCircle,
  Award,
  ListTodo,
  Timer,
  Video,
  ChevronRight,
  LogOut
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"
import { StudentShell } from "@/components/student/StudentShell"
import { UserMenu } from "@/components/UserMenu"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

import type { Profile, Exam, Submission } from "@/types"

export default function StudentXDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [userXp, setUserXp] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const targetDate = new Date("2027-06-11T07:30:00").getTime()

    const updateCountdown = () => {
      const now = new Date().getTime()
      const difference = targetDate - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/login?error=profile_not_found")
        return
      }

      // Authorization guard: Student X only
      if (profileData.role !== "student" || profileData.nickname !== "X") {
        router.push("/student/dashboard")
        return
      }

      setProfile(profileData)

      const { stats } = await getUserStats(user.id)
      setUserXp(stats.xp)

      // Query only exams assigned to 'x'
      const { data: examsData } = await supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .eq("assigned_to", "x")
        .order("created_at", { ascending: false })

      if (examsData) {
        setAvailableExams(examsData)
      }

      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*, exam:exams(*)")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false })
      if (submissionsData) setSubmissions(submissionsData)

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  const filteredExams = useMemo(() => {
    return availableExams.filter((exam) => {
      const matchSubject = selectedSubject === "all" || exam.subject === selectedSubject
      const matchSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSubject && matchSearch
    })
  }, [availableExams, searchQuery, selectedSubject])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const hasSubmitted = (examId: string) => submissions.some((submission) => submission.exam_id === examId)
  const getSubmission = (examId: string) => submissions.find((submission) => submission.exam_id === examId)

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <Loading label="Khởi động không gian Dream Engine..." />
      </div>
    )
  }

  const completedCount = submissions.length
  const bestScore = submissions.length > 0 ? Math.max(...submissions.map((submission) => submission.score)).toFixed(1) : "--"

  return (
    <StudentShell className={cn("bg-[hsl(var(--background))] text-[hsl(var(--foreground))]", inter.className)}>
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/90 px-4 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
              <GraduationCap className="h-4 w-4 text-[hsl(var(--primary))]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tighter text-[hsl(var(--foreground))] leading-none">ExamHub</span>
              <span className={cn("mt-1 text-[9px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--primary))] animate-pulse", jetbrainsMono.className)}>
                Space X
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <UserMenu
              userName={profile?.full_name || "X"}
              userClass="Lớp X"
              onLogout={handleLogout}
              role="student"
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl w-full px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Welcome Block */}
        <section className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-start">
          <div>
            <p className={cn("mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/40 bg-[hsl(var(--card))] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-ping" />
              Dream Engine Edition
            </p>
            <h1 className={cn("max-w-4xl text-5xl tracking-[-0.03em] leading-tight text-[hsl(var(--foreground))] md:text-7xl lg:text-8xl font-normal", instrumentSerif.className)}>
              Xin chào, X
              <span className="mt-3 block max-w-2xl font-normal text-3xl leading-tight text-[hsl(var(--muted-foreground))] md:text-5xl italic">
                "Học nhi thời tập chi, bất diệc duyệt hồ?"
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-[1.7] text-[hsl(var(--muted-foreground))] md:text-lg italic">
              "Học mà thường ôn tập, chẳng cũng vui lắm sao? Không tích lũy từng bước nhỏ, không thể đi xa vạn dặm." – Tuân Tử
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#available-exams">
                <Button className="rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] font-semibold px-6 py-5 transition-transform duration-200 active:scale-[0.98]">
                  Bắt đầu luyện đề
                </Button>
              </a>
              <Link href="/student/analytics">
                <Button variant="outline" className="rounded-xl border-[hsl(var(--border))]/60 hover:border-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-transparent px-6 py-5 transition-colors">
                  Chi tiết tiến độ
                </Button>
              </Link>
            </div>
          </div>

          {/* Gamification Widget */}
          <div className="space-y-6">
            {/* Countdown to THPT 2027 Widget */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[hsl(var(--primary))]/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[hsl(var(--primary))] mb-4">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Đếm ngược THPT Quốc Gia 2027</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Ngày", value: timeLeft.days },
                  { label: "Giờ", value: timeLeft.hours },
                  { label: "Phút", value: timeLeft.minutes },
                  { label: "Giây", value: timeLeft.seconds }
                ].map((item) => (
                  <div key={item.label} className="bg-[hsl(var(--background))] border border-[hsl(var(--border))]/10 rounded-xl p-2.5">
                    <span className={cn("text-2xl font-bold text-[hsl(var(--foreground))]", jetbrainsMono.className)}>
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mt-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Ngày thi dự kiến: <span className="text-[hsl(var(--primary))] font-semibold">11/06/2027</span>
                </p>
              </div>
            </div>

            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">XP Năng lượng</p>
                  <p className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))] mt-1">{userXp}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))]/45 bg-[hsl(var(--background))]">
                  <Zap className="h-5 w-5 text-[hsl(var(--primary))]" />
                </div>
              </div>
              <XpBar xp={userXp} size="sm" />
              <div className="mt-6 rounded-xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--background))] p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--primary))]" /> Điểm danh tích lũy
                </p>
                <DailyCheckIn onComplete={({ xp }) => setUserXp((prev) => prev + xp)} />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Đề giao riêng", value: availableExams.length, icon: FileText },
            { label: "Đã hoàn thành", value: completedCount, icon: CheckCircle },
            { label: "Kỷ lục điểm", value: bestScore, icon: Trophy },
            { label: "Năng lượng tích lũy", value: `${userXp} XP`, icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>{stat.label}</p>
                <p className="text-3xl font-semibold mt-2 text-[hsl(var(--foreground))]">{stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]">
                <stat.icon className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            </div>
          ))}
        </section>

        {/* Quick Tools Grid */}
        <section className="mt-10">
          <h2 className={cn("text-2xl text-[hsl(var(--foreground))] mb-5 font-normal", instrumentSerif.className)}>Công cụ học tập</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
              { href: "/arena", label: "Đấu trường", icon: Swords },
              { href: "/student/ielts", label: "Luyện thi IELTS", icon: GraduationCap },
              { href: "/student/achievements", label: "Kho thành tích", icon: Award },
              { href: "/student/X/timetable", label: "Thời khóa biểu X", icon: Calendar },
              { href: "/student/X/checklist", label: "Checklist / Mục tiêu", icon: ListTodo },
              { href: "/student/co-study", label: "Phòng Pomodoro", icon: Timer },
              { href: "/live", label: "Lớp học trực tuyến", icon: Video },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl p-5 hover:border-[hsl(var(--primary))] transition-all group duration-200">
                <item.icon className="mb-4 h-6 w-6 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" strokeWidth={1.5} />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</p>
                  <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 group-hover:text-[hsl(var(--primary))] transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Exams Table block */}
        <section id="available-exams" className="mt-10 bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/25 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className={cn("text-3xl text-[hsl(var(--foreground))] font-normal", instrumentSerif.className)}>Nhiệm vụ đề thi của X</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Các đề thi độc quyền được thầy cô thiết kế và chỉ định</p>
            </div>
            
            <div className="flex items-center gap-2 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))] px-4 py-2">
              <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full bg-transparent text-sm outline-none text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))]/20 p-4">
            <button
              onClick={() => setSelectedSubject("all")}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs tracking-wider uppercase transition-colors whitespace-nowrap border",
                selectedSubject === "all"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent font-bold"
                  : "border-[hsl(var(--border))]/40 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
              )}
            >
              Tất cả
            </button>
            {SUBJECTS.filter((subject) => availableExams.some((exam) => exam.subject === subject.value)).map((subject) => (
              <button
                key={subject.value}
                onClick={() => setSelectedSubject(subject.value)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs tracking-wider uppercase transition-colors whitespace-nowrap border",
                  selectedSubject === subject.value
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-transparent font-bold"
                    : "border-[hsl(var(--border))]/40 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]"
                )}
              >
                {subject.label}
              </button>
            ))}
          </div>

          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]/20" />
              <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">Chưa có đề thi được giao</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Các đề thi được giáo viên chỉ định riêng sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]/20">
              {filteredExams.map((exam) => {
                const subjectInfo = getSubjectInfo(exam.subject || "other")
                const submitted = hasSubmitted(exam.id)
                const submission = getSubmission(exam.id)

                return (
                  <div key={exam.id} className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between hover:bg-[hsl(var(--background))]/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]">
                        <span className="text-2xl">{subjectInfo.icon}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">{exam.title}</h3>
                          {submitted && submission && (
                            <span className={cn("rounded-lg border border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[hsl(var(--primary))]", jetbrainsMono.className)}>
                              {submission.score.toFixed(1)} ĐIỂM
                            </span>
                          )}
                        </div>
                        <div className={cn("mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            {subjectInfo.label}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {exam.duration} phút
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            {exam.total_questions} câu hỏi
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-auto">
                      {submitted ? (
                        <>
                          <Link href={`/student/exams/${exam.id}/result`}>
                            <Button variant="outline" size="sm" className="rounded-lg border-[hsl(var(--border))]/60 hover:border-[hsl(var(--foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-transparent">
                              Xem kết quả
                            </Button>
                          </Link>
                          <Link href={`/student/exams/${exam.id}/take`}>
                            <Button size="sm" className="rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] font-semibold">
                              Làm lại
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link href={`/student/exams/${exam.id}/take`}>
                          <Button size="sm" className="rounded-lg bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] font-semibold px-5">
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
        </section>
      </main>
    </StudentShell>
  )
}
