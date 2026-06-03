"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
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
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"
import { ChallengesWidget } from "@/components/gamification/ChallengeCard"
import { BottomNav } from "@/components/BottomNav"
import { StudentHeader } from "@/components/student/StudentHeader"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentStatCard } from "@/components/student/StudentStatCard"
import { GradeOnboardingModal } from "@/components/student/GradeOnboardingModal"

interface Profile {
  id: string
  role: string
  full_name: string | null
  class: string | null
  grade: number | null
  class_suffix: string | null
}

interface Exam {
  id: string
  title: string
  duration: number
  total_questions: number
  status: "draft" | "published"
  created_at: string
  subject?: string
}

interface Submission {
  id: string
  exam_id: string
  score: number
  submitted_at: string
  exam?: Exam
}

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [userXp, setUserXp] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/login?error=profile_not_found")
        return
      }
      if (profileData.role !== "student") {
        router.push("/teacher/dashboard")
        return
      }

      setProfile(profileData)

      const { stats } = await getUserStats(user.id)
      setUserXp(stats.xp)

      let examsQuery = supabase
        .from("exams")
        .select("*")
        .eq("status", "published")

      if (profileData.grade !== null) {
        examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profileData.grade}`)
      }

      const { data: examsData } = await examsQuery.order("created_at", { ascending: false })
      if (examsData) {
        const studentClassSuffix = profileData.class_suffix?.toUpperCase()
        const visibleExams = examsData.filter((exam: any) => {
          if (exam.target_classes && exam.target_classes.length > 0) {
            return studentClassSuffix && exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix)
          }
          return true
        })
        setAvailableExams(visibleExams)
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

  if (loading) return <Loading fullPage label="Đang tải dữ liệu học tập..." />

  const completedCount = submissions.length
  const bestScore = submissions.length > 0 ? Math.max(...submissions.map((submission) => submission.score)).toFixed(1) : "--"

  return (
    <StudentShell>
      <StudentHeader name={profile?.full_name} studentClass={profile?.class} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-start">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <GraduationCap className="h-3.5 w-3.5" /> Student dashboard
            </p>
            <h1 className="max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">
              Xin chào, {profile?.full_name || "bạn"}
              <span className="mt-3 block max-w-2xl font-serif-italic text-3xl leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-5xl">
                sẵn sàng bắt đầu một phiên học mới?
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-[1.7] text-[hsl(var(--muted-foreground))] md:text-lg">
              Theo dõi tiến độ, chọn đề thi và tiếp tục luyện tập trong một không gian tối giản, rõ ràng và ít nhiễu hơn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/student/exams">
                <Button className="rounded-full bg-[hsl(var(--foreground))] px-6 text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  Xem đề thi
                </Button>
              </Link>
              <Link href="/student/analytics">
                <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/80 bg-transparent px-6">
                  Xem tiến độ
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="liquid-glass rounded-[2rem] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p>
                  <p className="text-3xl font-semibold tracking-tight">{userXp}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
              <XpBar xp={userXp} size="sm" />
              <div className="mt-6 rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" /> Điểm danh hôm nay
                </p>
                <DailyCheckIn onComplete={({ xp }) => setUserXp((prev) => prev + xp)} />
              </div>
            </div>

            <div className="liquid-glass rounded-[2rem] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
              <ChallengesWidget limit={3} />
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudentStatCard label="Đề thi" value={availableExams.length} icon={FileText} />
          <StudentStatCard label="Hoàn thành" value={completedCount} icon={CheckCircle} />
          <StudentStatCard label="Điểm cao nhất" value={bestScore} icon={Trophy} />
          <StudentStatCard label="XP" value={userXp} icon={Zap} />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
            { href: "/arena", label: "Đấu trường", icon: Swords },
            { href: "/student/achievements", label: "Thành tích", icon: Award },
            { href: "/student/checklist", label: "Checklist / Planner", icon: ListTodo },
            { href: "/student/co-study", label: "Phòng Pomodoro YPT", icon: Timer },
            { href: "/live", label: "Lớp học trực tuyến", icon: Video },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="liquid-glass rounded-[2rem] p-5 transition-transform hover:-translate-y-0.5 shadow-sm">
              <item.icon className="mb-4 h-5 w-5 text-[hsl(var(--muted-foreground))]" strokeWidth={1.2} />
              <p className="text-sm font-medium">{item.label}</p>
            </Link>
          ))}
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] liquid-glass shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Đề thi có sẵn</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Chọn đề và bắt đầu luyện tập</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 px-4 py-2">
              <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))]/40 p-4">
            <button
              onClick={() => setSelectedSubject("all")}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition-colors whitespace-nowrap",
                selectedSubject === "all"
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                  : "border border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60"
              )}
            >
              Tất cả
            </button>
            {SUBJECTS.filter((subject) => availableExams.some((exam) => exam.subject === subject.value)).map((subject) => (
              <button
                key={subject.value}
                onClick={() => setSelectedSubject(subject.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors whitespace-nowrap",
                    selectedSubject === subject.value
                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    : "border border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60"
                )}
              >
                {subject.label}
              </button>
            ))}
          </div>

          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="mb-4 h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
              <h3 className="text-lg font-medium">Không tìm thấy đề thi</h3>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Thử đổi từ khóa hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]/40">
              {filteredExams.map((exam) => {
                const subjectInfo = getSubjectInfo(exam.subject || "other")
                const submitted = hasSubmitted(exam.id)
                const submission = getSubmission(exam.id)

                return (
                  <div key={exam.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60">
                        <span className="text-2xl">{subjectInfo.icon}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{exam.title}</h3>
                          {submitted && submission && (
                            <span className="rounded-full border border-[hsl(var(--border))]/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                              {submission.score.toFixed(1)} điểm
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[hsl(var(--muted-foreground))]">
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
                            {exam.total_questions} câu
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      {submitted ? (
                        <>
                          <Link href={`/student/exams/${exam.id}/result`}>
                            <Button variant="outline" size="sm" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                              Xem kết quả
                            </Button>
                          </Link>
                          <Link href={`/student/exams/${exam.id}/take`}>
                            <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                              Làm lại
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link href={`/student/exams/${exam.id}/take`}>
                          <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
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

      <BottomNav />
      {profile && profile.grade === null && (
        <GradeOnboardingModal
          userId={profile.id}
          onComplete={(selectedGrade, selectedClassSuffix) => {
            // Update local state immediately for UI feedback
            setProfile(prev => prev ? {
              ...prev,
              grade: selectedGrade,
              class_suffix: selectedClassSuffix,
              class: `${selectedGrade}${selectedClassSuffix}`
            } : null)
            // Force full reload to refetch exams with the new grade filter
            window.location.reload()
          }}
        />
      )}
    </StudentShell>
  )
}
