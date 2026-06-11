"use client"

import { useEffect, useState, useMemo } from "react"
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
import { SUBJECTS, getSubjectInfo, MAP_SUBJECT_TO_DB } from "@/lib/subjects"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { AnimatedSelect } from "@/components/ui/animated-select"

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
  chapter_id?: string | null
  lesson_id?: string | null
  section_id?: string | null
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
  const supabase = useMemo(() => createClient(), [])

  const [exams, setExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name?: string; class?: string } | null>(null)
  const [userXp, setUserXp] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [completionFilter, setCompletionFilter] = useState<"all" | "unsubmitted" | "submitted">("all")
  const [previewExam, setPreviewExam] = useState<Exam | null>(null)
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [showAllQuestions, setShowAllQuestions] = useState(false)

  // Profile data for cascade queries
  const [userProfile, setUserProfile] = useState<{ grade: number | null; nickname: string | null } | null>(null)

  // Cascade filter states
  const [selectedChapterId, setSelectedChapterId] = useState("")
  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [selectedSectionId, setSelectedSectionId] = useState("")

  const [chapters, setChapters] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, class, grade, class_suffix, nickname")
        .eq("id", authUser.id)
        .single()

      setUser({ id: authUser.id, full_name: profile?.full_name, class: profile?.class })
      setUserProfile({ grade: profile?.grade ?? null, nickname: profile?.nickname ?? null })

      const { stats } = await getUserStats(authUser.id)
      setUserXp(stats.xp)

      const isStudentX = profile?.nickname === "X"
      let examsQuery = supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .eq("assigned_to", isStudentX ? "x" : "normal")

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

      const { data: subsData } = await supabase
        .from("submissions")
        .select("exam_id, score")
        .eq("student_id", authUser.id)

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

  // Cascade: load chapters when subject or grade changes
  useEffect(() => {
    if (!userProfile?.grade || selectedSubject === "all") {
      setChapters([])
      setSelectedChapterId("")
      setLessons([])
      setSelectedLessonId("")
      setSections([])
      setSelectedSectionId("")
      return
    }

    const dbSubject = MAP_SUBJECT_TO_DB[selectedSubject] || selectedSubject
    fetch(`/api/study/chapters?subject=${dbSubject}&grade=${userProfile.grade}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setChapters(d.data)
        else setChapters([])
      })
      .catch(() => setChapters([]))

    setSelectedChapterId("")
    setLessons([])
    setSelectedLessonId("")
    setSections([])
    setSelectedSectionId("")
  }, [selectedSubject, userProfile?.grade])

  // Cascade: load lessons when chapter changes
  useEffect(() => {
    if (!selectedChapterId) {
      setLessons([])
      setSelectedLessonId("")
      setSections([])
      setSelectedSectionId("")
      return
    }

    fetch(`/api/study/lessons?chapter_id=${selectedChapterId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setLessons(d.data)
        else setLessons([])
      })
      .catch(() => setLessons([]))

    setSelectedLessonId("")
    setSections([])
    setSelectedSectionId("")
  }, [selectedChapterId])

  // Cascade: load sections when lesson changes
  useEffect(() => {
    if (!selectedLessonId) {
      setSections([])
      setSelectedSectionId("")
      return
    }

    fetch(`/api/study/sections?lesson_id=${selectedLessonId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setSections(d.data)
        else setSections([])
      })
      .catch(() => setSections([]))

    setSelectedSectionId("")
  }, [selectedLessonId])

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

    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, options")
      .eq("exam_id", exam.id)
      .order("order_index")
    if (questions) setPreviewQuestions(questions)

    setLoadingPreview(false)
  }

  const closePreview = () => {
    setPreviewExam(null)
    setPreviewQuestions([])
    setCurrentPreviewIndex(0)
  }

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => selectedSubject === "all" || e.subject === selectedSubject)
      .filter((e) => {
        if (completionFilter === "unsubmitted") return !submissions.has(e.id)
        if (completionFilter === "submitted") return submissions.has(e.id)
        return true
      })
      .filter((e) => !selectedChapterId || e.chapter_id === selectedChapterId)
      .filter((e) => !selectedLessonId || e.lesson_id === selectedLessonId)
      .filter((e) => !selectedSectionId || e.section_id === selectedSectionId)
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, selectedSubject, completionFilter, selectedChapterId, selectedLessonId, selectedSectionId, searchQuery, submissions])

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
          {/* Main Filter Bar Header */}
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Đề thi có sẵn</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {filteredExams.length} đề thi • {submissions.size} đã hoàn thành
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Completion filter tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-[hsl(var(--muted))]/30 p-1 text-xs shrink-0 self-start sm:self-auto">
                {[
                  { key: "all", label: "Tất cả" },
                  { key: "unsubmitted", label: "Chưa làm" },
                  { key: "submitted", label: "Đã làm" }
                ].map((t) => {
                  let label = t.label
                  if (t.key === "unsubmitted") {
                    const unsubmittedCount = exams.filter(e => !submissions.has(e.id)).length
                    if (unsubmittedCount > 0) {
                      label += ` (${unsubmittedCount})`
                    }
                  }
                  return (
                    <button
                      key={t.key}
                      onClick={() => setCompletionFilter(t.key as any)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 font-medium transition-all whitespace-nowrap",
                        completionFilter === t.key
                          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-sm"
                          : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Search input */}
              <div className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 px-4 py-2 w-full sm:w-[240px] lg:w-[280px]">
                <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm đề thi..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                />
              </div>
            </div>
          </div>

          {/* Subject Pills Selection */}
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

          {/* Cascading Hierarchical Filtering Row */}
          {selectedSubject !== "all" && chapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[hsl(var(--border))]/40 p-4 bg-[hsl(var(--card))]/10">
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] shrink-0 mr-1">
                Bài học:
              </span>

              {/* Chapter Dropdown */}
              <div className="w-[180px]">
                <AnimatedSelect
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  options={chapters.map((c) => ({ value: c.id, label: c.title }))}
                  placeholder="-- Chọn chương --"
                  size="sm"
                />
              </div>

              {/* Lesson Dropdown */}
              {selectedChapterId && lessons.length > 0 && (
                <div className="w-[180px]">
                  <AnimatedSelect
                    value={selectedLessonId}
                    onValueChange={setSelectedLessonId}
                    options={lessons.map((l) => ({ value: l.id, label: l.title }))}
                    placeholder="-- Chọn bài học --"
                    size="sm"
                  />
                </div>
              )}

              {/* Section Dropdown */}
              {selectedLessonId && sections.length > 0 && (
                <div className="w-[180px]">
                  <AnimatedSelect
                    value={selectedSectionId}
                    onValueChange={setSelectedSectionId}
                    options={sections.map((s) => ({ value: s.id, label: s.title }))}
                    placeholder="-- Chọn phần --"
                    size="sm"
                  />
                </div>
              )}

              {/* Clear filters trigger */}
              {(selectedChapterId || selectedLessonId || selectedSectionId) && (
                <button
                  onClick={() => {
                    setSelectedChapterId("")
                    setSelectedLessonId("")
                    setSelectedSectionId("")
                  }}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold ml-2"
                >
                  <X className="h-3.5 w-3.5" /> Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          {/* List of filtered exams */}
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
                              Kết quả
                            </Button>
                          </Link>
                          <Link href={`/student/exams/${exam.id}/take`}>
                            <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90" disabled={!available}>
                              Làm lại
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link href={`/student/exams/${exam.id}/take`}>
                          <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 px-5" disabled={!available}>
                            Vào thi <ArrowRight className="ml-1 h-4 w-4" />
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

        {/* Dialog preview exam */}
        {previewExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{previewExam.title}</h2>
                <Button variant="ghost" size="icon" onClick={closePreview} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-2 border border-[hsl(var(--border))]/60 rounded-xl p-4 bg-[hsl(var(--background))]/50">
                <p className="text-sm"><strong>Môn học:</strong> {getSubjectInfo(previewExam.subject || "other").label}</p>
                <p className="text-sm"><strong>Thời gian làm bài:</strong> {previewExam.duration} phút</p>
                <p className="text-sm"><strong>Số lượng câu hỏi:</strong> {previewExam.total_questions} câu</p>
                {previewExam.description && <p className="text-sm text-[hsl(var(--muted-foreground))]"><strong>Mô tả:</strong> {previewExam.description}</p>}
              </div>

              {loadingPreview ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : previewQuestions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Xem trước câu hỏi ({previewQuestions.length} câu)</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowAllQuestions(!showAllQuestions)} className="text-xs">
                      {showAllQuestions ? "Xem từng câu" : "Xem tất cả"}
                    </Button>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-4 border border-[hsl(var(--border))]/50 rounded-xl p-4 bg-[hsl(var(--background))]/30">
                    {showAllQuestions ? (
                      previewQuestions.map((q, idx) => (
                        <div key={q.id} className="pb-4 border-b border-[hsl(var(--border))]/20 last:border-b-0">
                          <p className="text-sm font-medium">Câu {idx + 1}: {q.question_text}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="text-xs text-[hsl(var(--muted-foreground))] p-2 rounded-lg bg-[hsl(var(--card))]/40 border border-[hsl(var(--border))]/20">
                                {["A", "B", "C", "D"][oIdx]}. {opt.replace(/^[A-D]\.\s*/, "")}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Câu {currentPreviewIndex + 1}: {previewQuestions[currentPreviewIndex].question_text}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {previewQuestions[currentPreviewIndex].options.map((opt, oIdx) => (
                              <div key={oIdx} className="text-xs text-[hsl(var(--muted-foreground))] p-2 rounded-lg bg-[hsl(var(--card))]/40 border border-[hsl(var(--border))]/20">
                                {["A", "B", "C", "D"][oIdx]}. {opt.replace(/^[A-D]\.\s*/, "")}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button size="sm" variant="outline" disabled={currentPreviewIndex === 0} onClick={() => setCurrentPreviewIndex(prev => prev - 1)}>Trước</Button>
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">Câu {currentPreviewIndex + 1} / {previewQuestions.length}</span>
                          <Button size="sm" variant="outline" disabled={currentPreviewIndex === previewQuestions.length - 1} onClick={() => setCurrentPreviewIndex(prev => prev + 1)}>Sau</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[hsl(var(--muted-foreground))] py-6 text-center">Không có bản xem trước câu hỏi cho đề thi này.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closePreview} className="rounded-full">Đóng</Button>
                <Link href={`/student/exams/${previewExam.id}/take`}>
                  <Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90" disabled={!isExamAvailable(previewExam)}>
                    Bắt đầu làm bài
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </StudentShell>
  )
}
