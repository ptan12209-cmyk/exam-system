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
  Clock,
  Eye,
  FileText,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo, MAP_SUBJECT_TO_DB } from "@/lib/subjects"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { AnimatedSelect } from "@/components/ui/animated-select"

import type { Exam, Question, Submission } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function StudentExamsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [exams, setExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name?: string; class?: string } | null>(null)
  const [userXp, setUserXp] = useState(0)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedGrade, setSelectedGrade] = useState<number | string>("all")
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
      setSelectedGrade(profile?.grade ?? "all")

      const { stats } = await getUserStats(authUser.id)
      setStudentStats(stats)
      setUserXp(stats.xp)

      const isStudentX = profile?.nickname === "X"
      const examsQuery = supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .eq("assigned_to", isStudentX ? "x" : "normal")

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
          if (s.exam_id) {
            const existing = subMap.get(s.exam_id)
            if (!existing || s.score > existing) subMap.set(s.exam_id, s.score)
          }
        })
        setSubmissions(subMap)
      }

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  // Cascade: load chapters when subject or grade changes
  useEffect(() => {
    const activeGrade = typeof selectedGrade === "number" ? selectedGrade : (userProfile?.grade || 12)
    if (!activeGrade || selectedSubject === "all") {
      setChapters([])
      setSelectedChapterId("")
      setLessons([])
      setSelectedLessonId("")
      setSections([])
      setSelectedSectionId("")
      return
    }

    const dbSubject = MAP_SUBJECT_TO_DB[selectedSubject] || selectedSubject
    fetch(`/api/study/chapters?subject=${dbSubject}&grade=${activeGrade}`)
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
  }, [selectedSubject, selectedGrade, userProfile?.grade])

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
      .filter((e) => {
        if (selectedGrade === "all") return true
        if (selectedGrade === "general") return e.target_grade === null || e.target_grade === undefined
        return e.target_grade === Number(selectedGrade)
      })
      .filter((e) => !selectedChapterId || e.chapter_id === selectedChapterId)
      .filter((e) => !selectedLessonId || e.lesson_id === selectedLessonId)
      .filter((e) => !selectedSectionId || e.section_id === selectedSectionId)
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, selectedSubject, completionFilter, selectedGrade, selectedChapterId, selectedLessonId, selectedSectionId, searchQuery, submissions])

  const { mainExams, advancedExams } = useMemo(() => {
    const main: Exam[] = []
    const adv: Exam[] = []
    filteredExams.forEach((e) => {
      if (e.is_advanced) {
        adv.push(e)
      } else {
        main.push(e)
      }
    })
    return { mainExams: main, advancedExams: adv }
  }, [filteredExams])

  const renderExamCard = (exam: Exam) => {
    const hasSubmitted = submissions.has(exam.id)
    const bestScore = submissions.get(exam.id)
    const available = isExamAvailable(exam)
    const subjectInfo = getSubjectInfo(exam.subject || "other")

    return (
      <div key={exam.id} className="flex flex-col justify-between p-5 rounded-2xl bg-[var(--os-card)] border border-[var(--os-muted)]/20 hover:border-[var(--os-accent)]/30 transition-colors">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)]">
            <span className="text-xl">{subjectInfo.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold leading-tight text-[var(--os-fg)] truncate max-w-[220px]" title={exam.title}>
                {exam.title}
              </h4>
              {hasSubmitted && bestScore !== undefined && (
                <span className={cn("rounded-lg border border-[var(--os-accent)]/30 bg-[var(--os-accent)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--os-accent)]", jetbrainsMono.className)}>
                  {bestScore.toFixed(1)} ĐIỂM
                </span>
              )}
              {!available && (
                <span className="rounded-lg border border-[var(--os-muted)]/30 bg-transparent px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--os-muted)]">
                  Chưa mở
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--os-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exam.duration}m
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {exam.total_questions} câu
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(exam.created_at || "").toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--os-muted)]/20 pt-3">
          <Button variant="outline" size="sm" onClick={() => openPreview(exam)} className="h-8 rounded-xl border-[var(--os-muted)]/40 hover:border-[var(--os-accent)] text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent text-xs transition-colors">
            <Eye className="mr-1 h-3.5 w-3.5" /> Xem đề
          </Button>

          {hasSubmitted ? (
            <>
              <Link href={`/student/exams/${exam.id}/result`}>
                <Button variant="outline" size="sm" className="h-8 rounded-xl border-[var(--os-muted)]/40 hover:border-[var(--os-accent)] text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent text-xs transition-colors">
                  Kết quả
                </Button>
              </Link>
              <Link href={`/student/exams/${exam.id}/take`}>
                <Button size="sm" className="h-8 rounded-xl bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] font-bold text-xs transition-colors" disabled={!available}>
                  Làm lại
                </Button>
              </Link>
            </>
          ) : (
            <Link href={`/student/exams/${exam.id}/take`}>
              <Button size="sm" className="h-8 rounded-xl bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] font-bold px-4 text-xs transition-colors" disabled={!available}>
                Vào thi <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
        <Loading label="Đang tải danh sách đề thi..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={user?.full_name}
        userXp={userXp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-card)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <FileText className="h-3.5 w-3.5" /> Exams
            </p>
            <h1 className={cn("max-w-3xl text-4xl sm:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Đề thi có sẵn
              <span className="mt-2 block max-w-2xl text-2xl sm:text-3xl text-[var(--os-muted)] leading-tight tracking-normal italic">
                chọn đề, bắt đầu ngay.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--os-muted)]">
              Danh sách đề thi được sắp xếp gọn gàng theo môn, trạng thái và lịch mở để bạn truy cập nhanh hơn.
            </p>
          </div>

          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-[var(--os-muted)] font-mono">XP hiện tại</p>
            <div className="mt-2 text-3xl font-bold text-[var(--os-fg)]">{userXp} XP</div>
            <div className="mt-4">
              <div className="rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)] p-4 text-xs text-[var(--os-muted)]">
                Sẵn sàng khám phá đề thi mới và xem lại kết quả của bạn.
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="mt-10 overflow-hidden rounded-2xl bg-[var(--os-card)] border border-[var(--os-muted)]/20 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[var(--os-muted)]/20 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Đề thi có sẵn</h2>
              <p className="text-xs text-[var(--os-muted)] mt-0.5">
                {filteredExams.length} đề thi • {submissions.size} đã hoàn thành
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Completion Filter Tabs */}
              <div className="flex items-center gap-1 rounded-xl bg-[var(--os-bg)] border border-[var(--os-muted)]/20 p-1 text-xs shrink-0 self-start sm:self-auto">
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
                        "rounded-lg px-3.5 py-1.5 font-semibold transition-all whitespace-nowrap",
                        completionFilter === t.key
                          ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] shadow-sm"
                          : "text-[var(--os-muted)] hover:text-[var(--os-fg)]"
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Search input */}
              <div className="flex items-center gap-3 rounded-xl border border-[var(--os-muted)]/30 bg-[var(--os-bg)] px-4 py-2 w-full sm:w-[240px] lg:w-[280px]">
                <Search className="h-4 w-4 text-[var(--os-muted)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm đề thi..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--os-muted)] text-[var(--os-fg)]"
                />
              </div>
            </div>
          </div>

          {/* Grade Tabs Selection */}
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--os-muted)]/20 p-4 bg-[var(--os-bg)]/40">
            <span className="text-[10px] font-bold text-[var(--os-muted)] flex items-center px-2 uppercase tracking-wider whitespace-nowrap font-mono">Khối lớp:</span>
            {[
              { value: "all", label: "Tất cả các lớp" },
              { value: 12, label: "Lớp 12" },
              { value: 11, label: "Lớp 11" },
              { value: 10, label: "Lớp 10" },
              { value: "general", label: "Đề thi chung" }
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => setSelectedGrade(g.value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border",
                  selectedGrade === g.value
                    ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-transparent"
                    : "border-[var(--os-muted)]/40 bg-transparent text-[var(--os-muted)] hover:border-[var(--os-accent)] hover:text-[var(--os-fg)]"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Subject Pills Selection */}
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--os-muted)]/20 p-4 bg-[var(--os-card)]">
            <button
              onClick={() => setSelectedSubject("all")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap border",
                selectedSubject === "all" ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-transparent" : "border-[var(--os-muted)]/40 bg-transparent text-[var(--os-muted)] hover:border-[var(--os-accent)] hover:text-[var(--os-fg)]"
              )}
            >
              TẤT CẢ MÔN HỌC
            </button>
            {SUBJECTS.filter((subject) => exams.some((exam) => exam.subject === subject.value)).map((subject) => (
              <button
                key={subject.value}
                onClick={() => setSelectedSubject(subject.value)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap border",
                  selectedSubject === subject.value ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-transparent" : "border-[var(--os-muted)]/40 bg-transparent text-[var(--os-muted)] hover:border-[var(--os-accent)] hover:text-[var(--os-fg)]"
                )}
              >
                {subject.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Cascading Hierarchical Filtering Row */}
          {selectedSubject !== "all" && chapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--os-muted)]/20 p-4 bg-[var(--os-bg)]/30">
              <span className="text-[10px] font-bold text-[var(--os-muted)] shrink-0 mr-1 uppercase tracking-wider font-mono">
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
                  className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold ml-2"
                >
                  <X className="h-3.5 w-3.5" /> Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Side-by-side lists of Main and Advanced exams */}
          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="mb-4 h-12 w-12 text-[var(--os-muted)]/20" />
              <h3 className="text-base font-semibold text-[var(--os-fg)]">Không tìm thấy đề thi</h3>
              <p className="mt-1 text-xs text-[var(--os-muted)]">Thử đổi từ khóa hoặc bộ lọc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--os-muted)]/20 bg-[var(--os-bg)]/20">
              {/* Main Exercises Column */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--os-muted)]/20 pb-3 mb-2">
                  <h3 className="text-sm font-bold text-[var(--os-accent)] flex items-center gap-2">
                    <span className="text-xl">📘</span> Chuỗi bài tập chính
                  </h3>
                  <span className="text-xs bg-[var(--os-accent)]/15 text-[var(--os-accent)] px-2.5 py-0.5 rounded-lg font-bold font-mono">
                    {mainExams.length} đề
                  </span>
                </div>
                {mainExams.length === 0 ? (
                  <p className="text-xs italic text-[var(--os-muted)] text-center py-10">Chưa có đề bài tập chính nào.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-1">
                    {mainExams.map((exam) => renderExamCard(exam))}
                  </div>
                )}
              </div>

              {/* Advanced Exercises Column */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--os-muted)]/20 pb-3 mb-2">
                  <h3 className="text-sm font-bold text-[var(--os-accent)]/80 flex items-center gap-2">
                    <span className="text-xl">⚡</span> Chuỗi nâng trình (Nâng cao)
                  </h3>
                  <span className="text-xs bg-[var(--os-accent)]/15 text-[var(--os-accent)]/80 px-2.5 py-0.5 rounded-lg font-bold font-mono">
                    {advancedExams.length} đề
                  </span>
                </div>
                {advancedExams.length === 0 ? (
                  <p className="text-xs italic text-[var(--os-muted)] text-center py-10">Chưa có đề nâng trình nào.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-1">
                    {advancedExams.map((exam) => renderExamCard(exam))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Dialog preview exam */}
        {previewExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-[var(--os-muted)]/30 bg-[var(--os-card)] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--os-fg)]">{previewExam.title}</h2>
                <Button variant="ghost" size="icon" onClick={closePreview} className="rounded-full text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)]">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-2 border border-[var(--os-muted)]/20 rounded-xl p-4 bg-[var(--os-bg)]">
                <p className="text-sm text-[var(--os-muted)]"><strong>Môn học:</strong> <span className="text-[var(--os-fg)]">{getSubjectInfo(previewExam.subject || "other").label}</span></p>
                <p className="text-sm text-[var(--os-muted)]"><strong>Thời gian làm bài:</strong> <span className="text-[var(--os-fg)]">{previewExam.duration} phút</span></p>
                <p className="text-sm text-[var(--os-muted)]"><strong>Số lượng câu hỏi:</strong> <span className="text-[var(--os-fg)]">{previewExam.total_questions} câu</span></p>
                {previewExam.description && <p className="text-sm text-[var(--os-muted)]"><strong>Mô tả:</strong> <span className="text-[var(--os-fg)]">{previewExam.description}</span></p>}
              </div>

              {loadingPreview ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--os-accent)] border-t-transparent" />
                </div>
              ) : previewQuestions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--os-fg)]">Xem trước câu hỏi ({previewQuestions.length} câu)</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowAllQuestions(!showAllQuestions)} className="text-xs text-[var(--os-accent)] hover:text-[var(--os-accent)]/85 bg-transparent p-0 h-auto">
                      {showAllQuestions ? "Xem từng câu" : "Xem tất cả"}
                    </Button>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-4 border border-[var(--os-muted)]/20 rounded-xl p-4 bg-[var(--os-bg)]/50">
                    {showAllQuestions ? (
                      previewQuestions.map((q, idx) => (
                        <div key={q.id} className="pb-4 border-b border-[var(--os-muted)]/10 last:border-b-0">
                          <p className="text-sm font-bold text-[var(--os-fg)]">Câu {idx + 1}: {q.question_text}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {(q.options || []).map((opt, oIdx) => (
                              <div key={oIdx} className="text-xs text-[var(--os-muted)] p-2.5 rounded-lg bg-[var(--os-bg)] border border-[var(--os-muted)]/20">
                                {["A", "B", "C", "D"][oIdx]}. {opt.replace(/^[A-D]\.\s*/, "")}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="space-y-4">
                        {previewQuestions[currentPreviewIndex] && (
                          <div>
                            <p className="text-sm font-bold text-[var(--os-fg)]">Câu {currentPreviewIndex + 1}: {previewQuestions[currentPreviewIndex].question_text}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {(previewQuestions[currentPreviewIndex].options || []).map((opt, oIdx) => (
                                <div key={oIdx} className="text-xs text-[var(--os-muted)] p-2.5 rounded-lg bg-[var(--os-bg)] border border-[var(--os-muted)]/20">
                                  {["A", "B", "C", "D"][oIdx]}. {opt.replace(/^[A-D]\.\s*/, "")}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <Button size="sm" variant="outline" disabled={currentPreviewIndex === 0} onClick={() => setCurrentPreviewIndex(prev => prev - 1)} className="rounded-lg border-[var(--os-muted)]/40 text-[var(--os-muted)]">Trước</Button>
                          <span className="text-xs font-mono text-[var(--os-muted)]">Câu {currentPreviewIndex + 1} / {previewQuestions.length}</span>
                          <Button size="sm" variant="outline" disabled={currentPreviewIndex === previewQuestions.length - 1} onClick={() => setCurrentPreviewIndex(prev => prev + 1)} className="rounded-lg border-[var(--os-muted)]/40 text-[var(--os-muted)]">Sau</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--os-muted)] py-6 text-center">Không có bản xem trước câu hỏi cho đề thi này.</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closePreview} className="rounded-lg border-[var(--os-muted)]/40 text-[var(--os-muted)] hover:text-[var(--os-fg)]">Đóng</Button>
                <Link href={`/student/exams/${previewExam.id}/take`}>
                  <Button className="rounded-lg bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] font-bold" disabled={!isExamAvailable(previewExam)}>
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
