"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/shared/Loading"
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Play,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { BottomNav } from "@/components/BottomNav"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"

interface Exam {
  id: string
  title: string
  description?: string
  duration: number
  total_questions: number
  status: string
  subject?: string
  created_at: string
  is_scheduled?: boolean
  start_time?: string
  end_time?: string
}

interface Question {
  id: string
  question_text: string
  options: string[]
}

interface Submission {
  exam_id: string
  score: number
}

export default function StudentExamsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [exams, setExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name?: string; class?: string } | null>(null)
  const [userXp, setUserXp] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [previewExam, setPreviewExam] = useState<Exam | null>(null)
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [showAllQuestions, setShowAllQuestions] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("full_name, class, grade, class_suffix").eq("id", authUser.id).single()
      setUser({ id: authUser.id, full_name: profile?.full_name, class: profile?.class })

      const { stats } = await getUserStats(authUser.id)
      setUserXp(stats.xp)

      let examsQuery = supabase
        .from("exams")
        .select("*")
        .eq("status", "published")

      if (profile && profile.grade !== null) {
        examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profile.grade}`)
      }

      const { data: examsData } = await examsQuery.order("created_at", { ascending: false })
      if (examsData) {
        const studentClassSuffix = profile?.class_suffix?.toUpperCase()
        const visibleExams = examsData.filter((exam: any) => {
          if (exam.target_classes && exam.target_classes.length > 0) {
            return studentClassSuffix && exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix)
          }
          return true
        })
        setExams(visibleExams)
      }

      const { data: subsData } = await supabase.from("submissions").select("exam_id, score").eq("student_id", authUser.id)
      if (subsData) {
        const subMap = new Map<string, number>()
        subsData.forEach((s: Submission) => {
          const existing = subMap.get(s.exam_id)
          if (!existing || s.score > existing) subMap.set(s.exam_id, s.score)
        })
        setSubmissions(subMap)
      }

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isExamAvailable = (exam: Exam) => {
    if (!exam.is_scheduled) return true
    const now = new Date()
    if (exam.start_time && new Date(exam.start_time) > now) return false
    if (exam.end_time && new Date(exam.end_time) < now) return false
    return true
  }

  const openPreview = async (exam: Exam) => {
    setPreviewExam(exam)
    setLoadingPreview(true)
    setCurrentPreviewIndex(0)
    setShowAllQuestions(false)

    const { data: questions } = await supabase.from("questions").select("id, question_text, options").eq("exam_id", exam.id).order("order_index")
    if (questions) setPreviewQuestions(questions)

    setLoadingPreview(false)
  }

  const closePreview = () => {
    setPreviewExam(null)
    setPreviewQuestions([])
    setCurrentPreviewIndex(0)
  }

  const filteredExams = exams.filter((e) => selectedSubject === "all" || e.subject === selectedSubject).filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return <Loading fullPage label="Đang tải danh sách đề thi..." />
  }

  return (
    <StudentShell>
      <StudentHeader name={user?.full_name} studentClass={user?.class} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <FileText className="h-3.5 w-3.5" /> Exams
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight leading-tight md:text-6xl">
              Đề thi có sẵn
              <span className="mt-3 block max-w-2xl font-serif-italic text-3xl leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-5xl">
                chọn đề, bắt đầu ngay.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Danh sách đề thi được sắp xếp gọn gàng theo môn, trạng thái và lịch mở để bạn truy cập nhanh hơn.
            </p>
          </div>

          <div className="liquid-glass rounded-[2rem] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p>
            <div className="mt-2 text-3xl font-semibold">{userXp}</div>
            <div className="mt-4">
              <div className="rounded-2xl border border-[hsl(var(--border))]/50 p-4 text-sm text-[hsl(var(--muted-foreground))]">
                Sẵn sàng khám phá đề thi mới và xem lại kết quả của bạn.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] liquid-glass shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Đề thi có sẵn</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {filteredExams.length} đề thi • {submissions.size} đã hoàn thành
              </p>
            </div>
            <div className="flex w-full items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 px-4 py-2 lg:w-[320px]">
              <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))]/40 p-4">
            <button
              onClick={() => setSelectedSubject("all")}
              className={cn(
                "rounded-full px-4 py-2 text-sm whitespace-nowrap",
                selectedSubject === "all" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60"
              )}
            >
              Tất cả
            </button>
            {SUBJECTS.filter((subject) => exams.some((exam) => exam.subject === subject.value)).map((subject) => (
              <button
                key={subject.value}
                onClick={() => setSelectedSubject(subject.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm whitespace-nowrap",
                  selectedSubject === subject.value ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60"
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
                const hasSubmitted = submissions.has(exam.id)
                const bestScore = submissions.get(exam.id)
                const available = isExamAvailable(exam)
                const subjectInfo = getSubjectInfo(exam.subject || "other")

                return (
                  <div key={exam.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60">
                        <span className="text-2xl">{subjectInfo.icon}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{exam.title}</h3>
                          {hasSubmitted && bestScore !== undefined && (
                            <span className="rounded-full border border-[hsl(var(--border))]/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
                              {bestScore.toFixed(1)} điểm
                            </span>
                          )}
                          {!available && (
                            <span className="rounded-full border border-[hsl(var(--border))]/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                              Chưa mở
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
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <Button variant="outline" size="sm" onClick={() => openPreview(exam)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                        <Eye className="mr-1 h-4 w-4" /> Xem đề
                      </Button>

                      {hasSubmitted ? (
                        <>
                          <Link href={`/student/exams/${exam.id}/result`}>
                            <Button variant="outline" size="sm" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                              <CheckCircle className="mr-1 h-4 w-4" /> Kết quả
                            </Button>
                          </Link>
                          {available && (
                            <Link href={`/student/exams/${exam.id}/take`}>
                              <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                                Làm lại
                              </Button>
                            </Link>
                          )}
                        </>
                      ) : (
                        <Link href={available ? `/student/exams/${exam.id}/take` : "#"}>
                          <Button
                            size="sm"
                            disabled={!available}
                            className={cn(
                              "rounded-full",
                              available ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90" : "cursor-not-allowed bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                            )}
                          >
                            {available ? "Làm bài" : "Chưa mở"}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
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

      {previewExam && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl liquid-glass sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-4">
              <div>
                <h2 className="text-lg font-semibold">{previewExam.title}</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {previewQuestions.length} câu • {previewExam.duration} phút
                </p>
              </div>
              <button onClick={closePreview} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]">
                <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loading size="sm" />
                </div>
              ) : previewQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-3 h-12 w-12 text-[hsl(var(--muted-foreground))]/30" />
                  <p className="text-[hsl(var(--muted-foreground))]">Không có câu hỏi</p>
                </div>
              ) : showAllQuestions ? (
                <div className="space-y-5">
                  {previewQuestions.map((q, idx) => (
                    <div key={q.id} className="rounded-2xl border border-[hsl(var(--border))]/50 p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 text-sm font-semibold">
                          {idx + 1}
                        </span>
                        <p className="font-medium leading-relaxed">{q.question_text}</p>
                      </div>
                      <div className="grid gap-2 pl-11">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 p-3 text-sm text-[hsl(var(--muted-foreground))]">
                            <span className="mr-2 font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[hsl(var(--border))]/50 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 text-base font-semibold">
                      {currentPreviewIndex + 1}
                    </span>
                    <p className="text-lg font-medium leading-relaxed">{previewQuestions[currentPreviewIndex].question_text}</p>
                  </div>
                  <div className="grid gap-3">
                    {previewQuestions[currentPreviewIndex].options.map((opt, optIdx) => (
                      <div key={optIdx} className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 p-4 text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="mr-3 font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/30 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAllQuestions(!showAllQuestions)}
                  className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAllQuestions && "rotate-180")} />
                  {showAllQuestions ? "Xem từng câu" : "Xem tất cả"}
                </button>
                <div className="flex-1" />
                <Button variant="outline" onClick={closePreview} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                  Đóng
                </Button>
                <Link href={`/student/exams/${previewExam.id}/take`}>
                  <Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                    <Play className="mr-2 h-4 w-4" /> Làm bài ngay
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentShell>
  )
}
