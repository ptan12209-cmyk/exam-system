"use client"

import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FilterBar, EmptyState } from "@/components/shared"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  Share2,
  CalendarDays,
  Search,
  Edit,
  Loader2,
} from "lucide-react"

import { SUBJECTS, MAP_SUBJECT_TO_DB, MAP_DB_TO_SUBJECT } from "@/lib/subjects"
import { cn } from "@/lib/utils"

interface ExamInBank {
  id: string
  title: string
  subject: string
  description: string | null
  pdf_url: string | null
  answer_key: string | null
  total_questions: number
  created_at: string
  questions?: Array<{ question: string; options: string[]; answer: string }>
  target_grade?: number | null
  chapter_id?: string | null
  lesson_id?: string | null
  section_id?: string | null
  correct_answers?: string[] | null
  mc_answers?: any[] | null
  tf_answers?: any[] | null
  sa_answers?: any[] | null
  max_attempts?: number
  security_level?: number
  score_visibility_mode?: string
  score_visibility_threshold?: number | null
}

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000"

export default function ExamBankPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerPdfRef = useRef<HTMLInputElement>(null)

  const { success, error: toastError, warning } = useToast()
  const [fullName, setFullName] = useState("")
  const [exams, setExams] = useState<ExamInBank[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ multiple_choice?: string[]; true_false?: string[] } | null>(null)
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("toan")
  const [description, setDescription] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [answerKey, setAnswerKey] = useState("")
  const [totalQuestions, setTotalQuestions] = useState(30)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewExam, setPreviewExam] = useState<ExamInBank | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  // Publish target states
  const [publishingExam, setPublishingExam] = useState<ExamInBank | null>(null)
  const [publishGrade, setPublishGrade] = useState<string>("all")
  const [publishAssignedTo, setPublishAssignedTo] = useState<"normal" | "x">("normal")
  const [publishClasses, setPublishClasses] = useState("")
  const [publishIsScheduled, setPublishIsScheduled] = useState(false)
  const [publishStartTime, setPublishStartTime] = useState("")
  const [publishEndTime, setPublishEndTime] = useState("")

  // Filter states
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterGrade, setFilterGrade] = useState("all")
  const [filterChapterId, setFilterChapterId] = useState("")
  const [filterLessonId, setFilterLessonId] = useState("")
  const [filterSectionId, setFilterSectionId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Grade & Hierarchy states for creation form
  const [targetGrade, setTargetGrade] = useState<number | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState<string>("")
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [selectedSectionId, setSelectedSectionId] = useState<string>("")
  const [availableChapters, setAvailableChapters] = useState<any[]>([])
  const [availableLessons, setAvailableLessons] = useState<any[]>([])
  const [availableSections, setAvailableSections] = useState<any[]>([])

  // Hierarchy states for filtering
  const [filterChapters, setFilterChapters] = useState<any[]>([])
  const [filterLessons, setFilterLessons] = useState<any[]>([])
  const [filterSections, setFilterSections] = useState<any[]>([])

  const fetchExams = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push("/login")

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    setFullName(profile?.full_name || "")

    const { data } = await supabase.from("exams").select("*").eq("created_by", user.id).order("created_at", { ascending: false })
    setExams((data || []).map((e: ExamInBank) => ({ ...e, subject: MAP_DB_TO_SUBJECT[e.subject] || e.subject || "toan", total_questions: e.total_questions || 0 })))
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void fetchExams()
  }, [fetchExams])

  // Cascade for Creation form: load chapters when grade+subject available
  useEffect(() => {
    if (!targetGrade || !subject) { setAvailableChapters([]); return }
    const dbSubject = MAP_SUBJECT_TO_DB[subject] || subject
    fetch(`/api/study/chapters?subject=${dbSubject}&grade=${targetGrade}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableChapters(d.data); else setAvailableChapters([]) })
      .catch(() => setAvailableChapters([]))
  }, [targetGrade, subject])

  // Cascade for Creation form: load lessons when chapter changes
  useEffect(() => {
    if (!selectedChapterId) { setAvailableLessons([]); setAvailableSections([]); return }
    fetch(`/api/study/lessons?chapter_id=${selectedChapterId}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableLessons(d.data); else setAvailableLessons([]) })
      .catch(() => setAvailableLessons([]))
  }, [selectedChapterId])

  // Cascade for Creation form: load sections when lesson changes
  useEffect(() => {
    if (!selectedLessonId) { setAvailableSections([]); return }
    fetch(`/api/study/sections?lesson_id=${selectedLessonId}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableSections(d.data); else setAvailableSections([]) })
      .catch(() => setAvailableSections([]))
  }, [selectedLessonId])

  // Cascade for Filter Bar: load chapters
  useEffect(() => {
    if (filterGrade === "all" || filterSubject === "all") {
      setFilterChapters([])
      setFilterChapterId("")
      setFilterLessons([])
      setFilterLessonId("")
      setFilterSections([])
      setFilterSectionId("")
      return
    }
    const dbSubject = MAP_SUBJECT_TO_DB[filterSubject] || filterSubject
    fetch(`/api/study/chapters?subject=${dbSubject}&grade=${filterGrade}`)
      .then(r => r.json()).then(d => { if (d.data) setFilterChapters(d.data); else setFilterChapters([]) })
      .catch(() => setFilterChapters([]))

    setFilterChapterId("")
    setFilterLessons([])
    setFilterLessonId("")
    setFilterSections([])
    setFilterSectionId("")
  }, [filterSubject, filterGrade])

  // Cascade for Filter Bar: load lessons
  useEffect(() => {
    if (!filterChapterId) {
      setFilterLessons([])
      setFilterLessonId("")
      setFilterSections([])
      setFilterSectionId("")
      return
    }
    fetch(`/api/study/lessons?chapter_id=${filterChapterId}`)
      .then(r => r.json()).then(d => { if (d.data) setFilterLessons(d.data); else setFilterLessons([]) })
      .catch(() => setFilterLessons([]))

    setFilterLessonId("")
    setFilterSections([])
    setFilterSectionId("")
  }, [filterChapterId])

  // Cascade for Filter Bar: load sections
  useEffect(() => {
    if (!filterLessonId) {
      setFilterSections([])
      setFilterSectionId("")
      return
    }
    fetch(`/api/study/sections?lesson_id=${filterLessonId}`)
      .then(r => r.json()).then(d => { if (d.data) setFilterSections(d.data); else setFilterSections([]) })
      .catch(() => setFilterSections([]))

    setFilterSectionId("")
  }, [filterLessonId])

  const resetForm = () => {
    setTitle("")
    setSubject("toan")
    setDescription("")
    setPdfFile(null)
    setPdfUrl("")
    setAnswerKey("")
    setTotalQuestions(30)
    setEditingId(null)
    setAnswerPdfFile(null)
    setScanResult(null)
    setTargetGrade(null)
    setSelectedChapterId("")
    setSelectedLessonId("")
    setSelectedSectionId("")
  }

  const handleAIScan = async () => {
    if (!answerPdfFile) return warning("Vui lòng chọn file PDF đáp án")
    setScanning(true)
    setScanResult(null)
    try {
      const formData = new FormData()
      formData.append("file", answerPdfFile)
      const response = await fetch(`${WORKER_URL}/extract-answers`, { method: "POST", body: formData })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setScanResult(data)
      if (data.multiple_choice?.length) {
        setAnswerKey(data.multiple_choice.map((ans: string, idx: number) => `${idx + 1}${ans}`).join(","))
        setTotalQuestions(data.multiple_choice.length)
      }
    } catch (err) {
      toastError("Lỗi quét AI: " + (err as Error).message + "\n\nĐảm bảo Python worker đang chạy!")
    } finally {
      setScanning(false)
    }
  }

  const handleEdit = (exam: ExamInBank) => {
    setEditingId(exam.id)
    setTitle(exam.title)
    setSubject(MAP_DB_TO_SUBJECT[exam.subject] || exam.subject || "toan")
    setDescription(exam.description || "")
    setPdfUrl(exam.pdf_url || "")
    setAnswerKey(exam.answer_key || "")
    setTotalQuestions(exam.total_questions)
    setTargetGrade(exam.target_grade ?? null)
    setSelectedChapterId(exam.chapter_id ?? "")
    setSelectedLessonId(exam.lesson_id ?? "")
    setSelectedSectionId(exam.section_id ?? "")
    setShowCreate(true)
  }

  const handlePdfUpload = async () => {
    if (!pdfFile) return
    setUploadingPdf(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const fileName = `${user.id}/${Date.now()}_${pdfFile.name}`
      const { error } = await supabase.storage.from("exams").upload(fileName, pdfFile)
      if (error) throw error
      const { data: urlData } = supabase.storage.from("exams").getPublicUrl(fileName)
      setPdfUrl(urlData.publicUrl)
    } catch (err) {
      toastError("Lỗi upload PDF: " + (err as Error).message)
    } finally {
      setUploadingPdf(false)
    }
  }

  const parseAnswerKey = (input: string): Record<number, string> => {
    const result: Record<number, string> = {}
    for (const part of input.split(/[,;\s]+/).filter(Boolean)) {
      const match = part.match(/(\d+)[.\-]?([A-Da-d])/)
      if (match) result[parseInt(match[1])] = match[2].toUpperCase()
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return warning("Vui lòng nhập tên đề thi")
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const parsedAnswers = parseAnswerKey(answerKey)
      const questions = Object.entries(parsedAnswers).map(([num, ans]) => ({ question: `Câu ${num}`, options: ["A", "B", "C", "D"], answer: ans }))
      
      const dbSubject = MAP_SUBJECT_TO_DB[subject] || subject
      const data = {
        title,
        subject: dbSubject,
        description: description || null,
        pdf_url: pdfUrl || null,
        answer_key: answerKey || null,
        total_questions: totalQuestions,
        questions: questions.length > 0 ? questions : null,
        status: "published",
        created_by: user.id,
        teacher_id: user.id,
        target_grade: targetGrade,
        chapter_id: selectedChapterId || null,
        lesson_id: selectedLessonId || null,
        section_id: selectedSectionId || null,
      }
      const query = editingId ? supabase.from("exams").update(data).eq("id", editingId) : supabase.from("exams").insert(data)
      const { error } = await query
      if (error) throw error
      await fetchExams()
      setShowCreate(false)
      resetForm()
    } catch (err) {
      toastError("Lỗi: " + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    try {
      const { data: submissions } = await supabase.from("submissions").select("student_id").eq("exam_id", id)
      if (submissions?.length) {
        const notifications = [...new Set(submissions.map((s: { student_id: string }) => s.student_id))].map((studentId) => ({
          user_id: studentId,
          type: "exam_deleted",
          title: "Đề thi đã bị xóa",
          message: `Đề thi "${deleteTarget.title}" đã bị giáo viên xóa khỏi hệ thống.`,
          is_read: false,
        }))
        await supabase.from("notifications").insert(notifications)
      }
      await supabase.from("exam_participants").delete().eq("exam_id", id)
      await supabase.from("exam_sessions").delete().eq("exam_id", id)
      await supabase.from("submission_audit_log").delete().eq("exam_id", id)
      await supabase.from("submissions").delete().eq("exam_id", id)
      const { error } = await supabase.from("exams").delete().eq("id", id)
      if (error) throw error
      await fetchExams()
    } catch (err) {
      toastError("Lỗi xóa: " + (err as Error).message)
    }
  }

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publishingExam) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Chưa đăng nhập")

      const classesArray = publishClasses.trim()
        ? publishClasses.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
        : null

      const dbSubject = MAP_SUBJECT_TO_DB[publishingExam.subject] || publishingExam.subject
      const parsedAnswers = parseAnswerKey(publishingExam.answer_key || "")

      const newExamData = {
        teacher_id: user.id,
        created_by: user.id,
        title: publishingExam.title.trim(),
        subject: dbSubject,
        duration: 45, // Default duration
        total_questions: publishingExam.total_questions,
        correct_answers: Object.values(parsedAnswers).length > 0 ? Object.values(parsedAnswers) : null,
        mc_answers: Object.entries(parsedAnswers).map(([num, ans]) => ({
          question: parseInt(num),
          answer: ans
        })),
        tf_answers: [],
        sa_answers: [],
        pdf_url: publishingExam.pdf_url,
        status: "published",
        is_scheduled: publishIsScheduled,
        start_time: publishIsScheduled && publishStartTime ? new Date(publishStartTime).toISOString() : null,
        end_time: publishIsScheduled && publishEndTime ? new Date(publishEndTime).toISOString() : null,
        score_visibility_mode: "always",
        security_level: 1,
        assigned_to: publishAssignedTo,
        target_grade: publishGrade === "all" ? null : Number(publishGrade),
        target_classes: classesArray,
        chapter_id: publishingExam.chapter_id || null,
        lesson_id: publishingExam.lesson_id || null,
        section_id: publishingExam.section_id || null,
      }

      const { data: newExam, error: insertError } = await supabase
        .from("exams")
        .insert(newExamData)
        .select()
        .single()

      if (insertError) throw insertError

      // Copy individual question records into questions table for preview / advanced result reviews
      if (Object.keys(parsedAnswers).length > 0) {
        const questionRecords = Object.entries(parsedAnswers).map(([num, ans], idx) => {
          let ansInt = 0
          if (ans === "A") ansInt = 0
          else if (ans === "B") ansInt = 1
          else if (ans === "C") ansInt = 2
          else if (ans === "D") ansInt = 3

          return {
            exam_id: newExam.id,
            question_text: `Câu ${num}`,
            options: ["A", "B", "C", "D"],
            correct_answer: ansInt,
            order_index: idx + 1
          }
        })

        const { error: questionsError } = await supabase
          .from("questions")
          .insert(questionRecords)

        if (questionsError) throw questionsError
      }

      success("Đăng tải đề thi thành công!")
      setPublishingExam(null)
      // Reset publish states
      setPublishGrade("all")
      setPublishAssignedTo("normal")
      setPublishClasses("")
      setPublishIsScheduled(false)
      setPublishStartTime("")
      setPublishEndTime("")
      await fetchExams()
    } catch (err) {
      toastError("Lỗi đăng tải: " + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Filtered exams calculation
  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => filterSubject === "all" || e.subject === filterSubject)
      .filter((e) => filterGrade === "all" || String(e.target_grade) === filterGrade)
      .filter((e) => !filterChapterId || e.chapter_id === filterChapterId)
      .filter((e) => !filterLessonId || e.lesson_id === filterLessonId)
      .filter((e) => !filterSectionId || e.section_id === filterSectionId)
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, filterSubject, filterGrade, filterChapterId, filterLessonId, filterSectionId, searchQuery])

  const subjectOptions = useMemo(() => {
    return SUBJECTS.map((s) => ({ value: s.value, label: `${s.icon} ${s.label}` }))
  }, [])

  const gradeOptions = useMemo(() => {
    return [
      { value: "all", label: "Tất cả khối" },
      ...Array.from({ length: 7 }, (_, i) => i + 6).map((g) => ({
        value: String(g),
        label: `Khối ${g}`,
      })),
    ]
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return <Loading fullPage label="Đang tải kho đề thi..." />
  }

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-lg">EH</div>
          <span className="text-lg font-bold tracking-tight">ExamHub</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-24 md:px-10 lg:pt-28">
        {/* Banner Section */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
              <FileText className="h-4 w-4" /> Exam bank
            </div>
            <h1 className="max-w-4xl font-serif-italic text-5xl tracking-[-2px] md:text-7xl lg:text-8xl">Ngân hàng đề thi</h1>
            <p className="mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">Lưu trữ, xem trước và quản lý các đề thi của bạn ở một nơi.</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-6 shadow-sm border border-[hsl(var(--border))]/60">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng đề đã lưu</p>
            <div className="mt-2 text-3xl font-semibold">{exams.length}</div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Dùng để tạo đề nhanh hơn</p>
          </div>
        </section>

        {/* Action Buttons Row */}
        <div className="mt-10 flex gap-3">
          <Button onClick={() => { resetForm(); setShowCreate(true) }} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            <Plus className="mr-2 h-4 w-4" /> Thêm đề thi
          </Button>
        </div>

        {/* Dynamic Filter Section */}
        <div className="mt-8 overflow-hidden rounded-[2rem] bg-[hsl(var(--card))]/30 border border-[hsl(var(--border))]/60 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <h3 className="font-semibold text-base">Bộ lọc tìm kiếm</h3>
            <div className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 px-4 py-2 w-full md:w-[300px]">
              <Search className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tiêu đề..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5 pt-2 border-t border-[hsl(var(--border))]/40">
            {/* Subject Dropdown */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Môn học</Label>
              <AnimatedSelect
                value={filterSubject}
                onValueChange={setFilterSubject}
                options={[{ value: "all", label: "Tất cả môn" }, ...subjectOptions]}
                placeholder="Môn học"
                size="sm"
              />
            </div>

            {/* Grade Dropdown */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Khối lớp</Label>
              <AnimatedSelect
                value={filterGrade}
                onValueChange={setFilterGrade}
                options={gradeOptions}
                placeholder="Khối lớp"
                size="sm"
              />
            </div>

            {/* Chapter Dropdown */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Chương</Label>
              <AnimatedSelect
                value={filterChapterId}
                onValueChange={setFilterChapterId}
                options={filterChapters.map(c => ({ value: c.id, label: c.title }))}
                placeholder="-- Chương --"
                disabled={filterGrade === "all" || filterSubject === "all" || filterChapters.length === 0}
                size="sm"
              />
            </div>

            {/* Lesson Dropdown */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Bài học</Label>
              <AnimatedSelect
                value={filterLessonId}
                onValueChange={setFilterLessonId}
                options={filterLessons.map(l => ({ value: l.id, label: l.title }))}
                placeholder="-- Bài học --"
                disabled={!filterChapterId || filterLessons.length === 0}
                size="sm"
              />
            </div>

            {/* Section Dropdown */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Phần</Label>
              <AnimatedSelect
                value={filterSectionId}
                onValueChange={setFilterSectionId}
                options={filterSections.map(s => ({ value: s.id, label: s.title }))}
                placeholder="-- Phần --"
                disabled={!filterLessonId || filterSections.length === 0}
                size="sm"
              />
            </div>
          </div>

          {(filterSubject !== "all" || filterGrade !== "all" || filterChapterId || filterLessonId || filterSectionId) && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setFilterSubject("all")
                  setFilterGrade("all")
                  setFilterChapterId("")
                  setFilterLessonId("")
                  setFilterSectionId("")
                }}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold"
              >
                <X className="h-3.5 w-3.5" /> Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={FileText} title="Chưa có đề thi nào phù hợp" description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo thêm đề mới." actionLabel="Thêm đề thi mới" onAction={() => setShowCreate(true)} iconColor="text-indigo-500" iconBgColor="bg-indigo-50 dark:bg-indigo-900/30" />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredExams.map((exam) => (
              <article key={exam.id} className="overflow-hidden rounded-[2rem] bg-[hsl(var(--card))] border border-[hsl(var(--border))]/60 shadow-sm flex flex-col justify-between">
                <div className="border-b border-[hsl(var(--border))]/50 p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-lg font-semibold">{exam.title}</h3>
                    {exam.pdf_url ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle className="mr-1 h-3 w-3" />PDF</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"><AlertTriangle className="mr-1 h-3 w-3" />No PDF</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-full bg-[hsl(var(--muted))]/30 px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                      {SUBJECTS.find((s) => s.value === exam.subject)?.label || exam.subject}
                    </span>
                    {exam.target_grade && (
                      <span className="inline-flex rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-[hsl(var(--primary))]">
                        Khối {exam.target_grade}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 opacity-50" /><span>{exam.total_questions} câu hỏi</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 opacity-50" /><span>{new Date(exam.created_at).toLocaleDateString("vi-VN")}</span></div>
                  </div>
                  <div className="flex gap-2 border-t border-[hsl(var(--border))]/25 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setPreviewExam(exam)} className="flex-1 rounded-full"><Eye className="mr-1 h-4 w-4" /> Preview</Button>
                    <Button variant="outline" size="sm" onClick={() => setPublishingExam(exam)} className="flex-1 rounded-full text-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400"><Share2 className="mr-1 h-4 w-4" /> Publish</Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(exam)} className="rounded-full"><Edit className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget({ id: exam.id, title: exam.title })} className="rounded-full text-red-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Modal Create/Edit */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-2xl rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="text-xl font-semibold">{editingId ? "Cập nhật đề thi" : "Thêm đề thi mới"}</h2>
                <button onClick={() => { setShowCreate(false); resetForm() }} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"><X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5 p-5 max-h-[75vh] overflow-y-auto">
                <section className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tên đề thi <span className="text-red-500">*</span></Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đề thi HK1 Vật Lý 12" className="rounded-xl" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Môn học</Label>
                    <AnimatedSelect
                      value={subject}
                      onValueChange={(val) => { setSubject(val); setSelectedChapterId(""); setSelectedLessonId(""); setSelectedSectionId("") }}
                      options={subjectOptions}
                      placeholder="Môn học"
                    />
                  </div>
                </section>
                <div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết về đề thi..." className="rounded-xl resize-none" rows={2} /></div>
                
                <section className="space-y-4 rounded-2xl border border-[hsl(var(--border))]/60 p-4 bg-[hsl(var(--muted))]/10">
                  <Label className="font-semibold flex items-center gap-2">
                    Phân tầng hệ thống bài tập (tuỳ chọn)
                  </Label>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Khối lớp</Label>
                      <AnimatedSelect
                        value={targetGrade === null ? "all" : String(targetGrade)}
                        onValueChange={(val) => { setTargetGrade(val === "all" ? null : Number(val)); setSelectedChapterId(""); setSelectedLessonId(""); setSelectedSectionId("") }}
                        options={gradeOptions}
                        placeholder="Khối lớp"
                        size="sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Chương</Label>
                      <AnimatedSelect
                        value={selectedChapterId}
                        onValueChange={(val) => { setSelectedChapterId(val); setSelectedLessonId(""); setSelectedSectionId("") }}
                        options={availableChapters.map(c => ({ value: c.id, label: c.title }))}
                        placeholder="-- Chương --"
                        disabled={!targetGrade || !subject || availableChapters.length === 0}
                        size="sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Bài học</Label>
                      <AnimatedSelect
                        value={selectedLessonId}
                        onValueChange={(val) => { setSelectedLessonId(val); setSelectedSectionId("") }}
                        options={availableLessons.map(l => ({ value: l.id, label: l.title }))}
                        placeholder="-- Bài học --"
                        disabled={!selectedChapterId || availableLessons.length === 0}
                        size="sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Phần</Label>
                      <AnimatedSelect
                        value={selectedSectionId}
                        onValueChange={setSelectedSectionId}
                        options={availableSections.map(s => ({ value: s.id, label: s.title }))}
                        placeholder="-- Phần --"
                        disabled={!selectedLessonId || availableSections.length === 0}
                        size="sm"
                      />
                    </div>
                  </div>
                  {!targetGrade || !subject ? (
                    <p className="text-[10px] text-amber-500">⚠️ Cần chọn Khối lớp và Môn học để hiển thị danh sách Chương.</p>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-indigo-200/50 dark:border-indigo-950/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
                  <Label className="mb-2 flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-400"><FileText className="h-4 w-4" />File đề thi (PDF)</Label>
                  <div className="flex gap-2">
                    <Input type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="rounded-xl" />
                    <Button type="button" onClick={handlePdfUpload} disabled={!pdfFile || uploadingPdf} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">{uploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</Button>
                  </div>
                  {pdfUrl && <p className="mt-2 flex items-center text-sm text-emerald-600"><CheckCircle className="mr-1 h-3 w-3" />Đã tải lên: {pdfUrl.split("/").pop()}</p>}
                </section>

                <section className="rounded-2xl border border-violet-200/50 dark:border-violet-950/40 bg-violet-50/40 dark:bg-violet-950/20 p-4">
                  <Label className="mb-2 flex items-center gap-2 font-semibold text-violet-700 dark:text-violet-400"><Wand2 className="h-4 w-4" />File đáp án & Quét AI</Label>
                  <div className="mb-3 flex gap-2">
                    <Input type="file" accept=".pdf" ref={answerPdfRef} onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)} className="rounded-xl" />
                    <Button type="button" onClick={handleAIScan} disabled={!answerPdfFile || scanning} className="rounded-full bg-violet-600 text-white hover:bg-violet-700">{scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Quét AI</Button>
                  </div>
                  {scanResult && <div className="mb-3 rounded-xl border border-violet-200/50 bg-[hsl(var(--card))] p-3 text-sm"><p className="font-medium text-emerald-600">✓ Tìm thấy: {scanResult.multiple_choice?.length || 0} câu trắc nghiệm</p>{scanResult.true_false?.length ? <p className="font-medium text-indigo-600">+ {scanResult.true_false.length} câu đúng/sai</p> : null}</div>}
                  <div className="space-y-2">
                    <div className="flex justify-between"><Label className="text-xs font-medium">Chuỗi đáp án</Label><span className="text-xs text-[hsl(var(--muted-foreground))]">Định dạng: 1A,2B,3C...</span></div>
                    <Textarea value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="1A,2B,3C,4D..." className="rounded-xl font-mono text-sm resize-none" rows={3} />
                  </div>
                </section>

                <div className="space-y-2">
                  <Label>Tổng số câu hỏi</Label>
                  <Input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} min={1} max={200} className="w-32 rounded-xl" />
                </div>
                
                <div className="flex gap-3 border-t border-[hsl(var(--border))]/50 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm() }} className="flex-1 rounded-full">Hủy</Button>
                  <Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Cập nhật" : "Lưu đề thi"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Publish to Exams */}
        {publishingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="text-xl font-semibold">Đăng tải thành Đề thi chính thức</h2>
                <button onClick={() => setPublishingExam(null)} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20">
                  <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>

              <form onSubmit={handlePublishSubmit} className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>Tên đề thi</Label>
                  <Input value={publishingExam.title} disabled className="rounded-xl bg-[hsl(var(--muted))]/20" />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label>Khối lớp học</Label>
                    <AnimatedSelect
                      value={publishGrade}
                      onValueChange={setPublishGrade}
                      options={gradeOptions}
                      placeholder="Chọn khối..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đối tượng học sinh</Label>
                    <AnimatedSelect
                      value={publishAssignedTo}
                      onValueChange={(val) => setPublishAssignedTo(val as "normal" | "x")}
                      options={[
                        { value: "normal", label: "Đại trà" },
                        { value: "x", label: "Học sinh X" }
                      ]}
                      placeholder="Chọn đối tượng..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lớp học cụ thể (tùy chọn)</Label>
                  <Input
                    value={publishClasses}
                    onChange={(e) => setPublishClasses(e.target.value)}
                    placeholder="VD: 12A1, 12A2 (phân tách bằng dấu phẩy)"
                    className="rounded-xl"
                  />
                </div>

                {/* Scheduling */}
                <div className="border border-[hsl(var(--border))]/60 rounded-xl p-4 bg-[hsl(var(--muted))]/5 space-y-3">
                  <label className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> Lên lịch mở đề thi</span>
                    <input
                      type="checkbox"
                      checked={publishIsScheduled}
                      onChange={(e) => setPublishIsScheduled(e.target.checked)}
                    />
                  </label>
                  {publishIsScheduled && (
                    <div className="grid gap-3 grid-cols-2 pt-2 border-t border-[hsl(var(--border))]/20">
                      <div className="space-y-1">
                        <Label className="text-xs">Thời gian mở</Label>
                        <Input
                          type="datetime-local"
                          value={publishStartTime}
                          onChange={(e) => setPublishStartTime(e.target.value)}
                          className="rounded-xl text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Thời gian đóng</Label>
                        <Input
                          type="datetime-local"
                          value={publishEndTime}
                          onChange={(e) => setPublishEndTime(e.target.value)}
                          className="rounded-xl text-xs"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-[hsl(var(--border))]/40">
                  <Button type="button" variant="outline" onClick={() => setPublishingExam(null)} className="flex-1 rounded-full">Hủy</Button>
                  <Button type="submit" disabled={saving} className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Side-by-side Preview Dialog */}
        {previewExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-4 px-6 bg-[hsl(var(--card))]">
                <h3 className="font-semibold text-lg">{previewExam.title}</h3>
                <button
                  onClick={() => setPreviewExam(null)}
                  className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"
                >
                  <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
              <div className="flex-1 grid md:grid-cols-2 overflow-hidden bg-[hsl(var(--background))]">
                {/* PDF Frame */}
                <div className="border-r border-[hsl(var(--border))]/40 h-full flex flex-col bg-[hsl(var(--muted))]/20">
                  {previewExam.pdf_url ? (
                    <iframe src={previewExam.pdf_url} className="w-full flex-1" title="PDF Preview" />
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                      Không có file PDF đề thi.
                    </div>
                  )}
                </div>

                {/* Question & Correct Answers list */}
                <div className="p-6 overflow-y-auto space-y-4 bg-[hsl(var(--background))]/50">
                  <h4 className="font-bold text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] border-b border-[hsl(var(--border))]/30 pb-2">
                    Danh sách câu hỏi & Đáp án
                  </h4>
                  {previewExam.answer_key ? (
                    <div className="grid gap-3 pr-1">
                      {Object.entries(parseAnswerKey(previewExam.answer_key)).map(([num, ans]) => (
                        <div
                          key={num}
                          className="flex items-center justify-between p-3 rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] font-bold text-xs">
                              {num}
                            </span>
                            <span className="text-sm font-medium">Câu số {num}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {["A", "B", "C", "D"].map((opt) => (
                              <span
                                key={opt}
                                className={cn(
                                  "h-7 w-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors",
                                  opt === ans
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[hsl(var(--muted))]/40 text-[hsl(var(--muted-foreground))]"
                                )}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      Chưa cấu hình chuỗi đáp án cho đề thi này.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <TeacherBottomNav />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Xóa đề thi?"
        description={`Bạn có chắc chắn muốn xóa đề thi "${deleteTarget?.title}"? Tất cả bài nộp, câu hỏi và dữ liệu liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
