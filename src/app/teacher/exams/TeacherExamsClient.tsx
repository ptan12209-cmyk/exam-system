"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { FilterBar } from "@/components/shared"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { FileText, Clock, Plus, Trash2, Users, BarChart3 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"

import type { Exam } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const inter = { className: "font-inter" }

export interface TeacherExamsClientProps {
  fullName: string
  exams: Exam[]
}

export function TeacherExamsClient({ fullName, exams: initialExams }: TeacherExamsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()

  const [exams, setExams] = useState<Exam[]>(initialExams)
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedGrade, setSelectedGrade] = useState<number | string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const executeDeleteExam = async () => {
    if (!deleteTarget) return

    try {
      const { error } = await supabase.from("exams").delete().eq("id", deleteTarget.id)
      if (error) throw error

      // Submissions cascade at the DB level; refresh the RSC payload too.
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      router.refresh()
      success("Xóa đề thi thành công!")
    } catch (err: unknown) {
      console.error("Failed to delete exam:", err)
      toastError(`Xóa đề thi thất bại: ${(err as Error).message}`)
    } finally {
      setDeleteTarget(null)
    }
  }

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => selectedSubject === "all" || e.subject === selectedSubject)
      .filter((e) => {
        if (selectedGrade === "all") return true
        if (selectedGrade === "general") return e.target_grade === null || e.target_grade === undefined
        return e.target_grade === Number(selectedGrade)
      })
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, selectedSubject, selectedGrade, searchQuery])

  const { mainExams, advancedExams } = useMemo(() => {
    const main: Exam[] = []
    const adv: Exam[] = []
    filteredExams.forEach((e) => {
      if (e.is_advanced) adv.push(e)
      else main.push(e)
    })
    return { mainExams: main, advancedExams: adv }
  }, [filteredExams])

  const subjectOptions = useMemo(() => {
    return SUBJECTS.filter((s) => exams.some((e) => e.subject === s.value))
  }, [exams])

  const renderExamCard = (exam: Exam) => {
    const subjectInfo = getSubjectInfo(exam.subject || "other")
    return (
      <div key={exam.id} className="flex flex-col justify-between p-5 rounded-xl bg-[var(--os-card)] border border-[var(--os-muted)]/20 hover:border-[var(--os-accent)]/30 transition-all">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)]">
            <span className="text-xl">{subjectInfo.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold leading-tight text-[var(--os-fg)] truncate max-w-[200px]" title={exam.title}>
                {exam.title}
              </h4>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[8px] font-bold font-mono uppercase tracking-wider",
                  exam.status === "published"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}
              >
                {exam.status === "published" ? "Phát hành" : "Nháp"}
              </span>
              {exam.assigned_to === "x" && (
                <span className="rounded bg-[var(--os-accent)]/15 text-[var(--os-accent)] border border-[var(--os-accent)]/30 px-1.5 py-0.5 text-[8px] font-bold font-mono uppercase tracking-wider animate-pulse">
                  TSTD
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--os-muted)] font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[var(--os-accent)]" />
                {exam.duration} phút
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-[var(--os-accent)]" />
                {exam.total_questions} câu
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[var(--os-accent)]" />
                {exam.submission_count || 0} lượt nộp
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--os-muted)]/10 pt-3">
          <Link href={`/teacher/exams/${exam.id}/scores`}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[var(--os-muted)]/30 bg-transparent text-[10px] font-bold text-[var(--os-muted)] hover:text-[var(--os-accent)] hover:border-[var(--os-accent)]">
              Kết quả
            </Button>
          </Link>
          <Link href={`/teacher/exams/${exam.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[var(--os-muted)]/30 bg-transparent text-[10px] font-bold text-[var(--os-muted)] hover:text-[var(--os-accent)] hover:border-[var(--os-accent)]">
              Sửa
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500 bg-transparent flex items-center gap-1.5 transition-colors text-[10px] font-bold"
            onClick={() => setDeleteTarget({ id: exam.id, title: exam.title })}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa
          </Button>
        </div>
      </div>
    )
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

        {/* Header section */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-card)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <FileText className="h-3.5 w-3.5 text-[var(--os-accent)]" /> Exam Manager
            </p>
            <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Quản lý đề thi
            </h1>
            <p className="mt-3 text-sm text-[var(--os-muted)] max-w-xl">
              Danh sách đề thi học sinh làm bài tập chính và chuỗi nâng trình tự luyện nâng cao.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/teacher/exams/create">
              <Button className="rounded-xl bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] px-5 py-5 text-xs font-bold shadow-md">
                <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} /> Soạn đề mới
              </Button>
            </Link>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="mt-8 rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <FilterBar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Tìm kiếm tên đề thi..." className="w-full" />
            </div>

            {/* Subject Selectors */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedSubject("all")}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border",
                  selectedSubject === "all"
                    ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-[var(--os-accent)]"
                    : "border-[var(--os-muted)]/20 bg-transparent text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:border-[var(--os-muted)]/40"
                )}
              >
                Tất cả môn học
              </button>
              {subjectOptions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedSubject(s.value)}
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors border",
                    selectedSubject === s.value
                      ? "bg-[var(--os-accent)] text-[var(--os-accent-fg)] border-[var(--os-accent)]"
                      : "border-[var(--os-muted)]/20 bg-transparent text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:border-[var(--os-muted)]/40"
                  )}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-[var(--os-muted)]/10 pt-3">
            <span className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono mr-2">Khối lớp:</span>
            {[
              { value: "all", label: "Tất cả" },
              { value: 12, label: "Lớp 12" },
              { value: 11, label: "Lớp 11" },
              { value: 10, label: "Lớp 10" },
              { value: 9, label: "Lớp 9" },
              { value: 8, label: "Lớp 8" },
              { value: 7, label: "Lớp 7" },
              { value: 6, label: "Lớp 6" },
              { value: "general", label: "Chung" }
            ].map((g) => (
              <button
                key={String(g.value)}
                onClick={() => setSelectedGrade(g.value)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[10px] font-bold whitespace-nowrap transition-colors border",
                  selectedGrade === g.value
                    ? "bg-[var(--os-fg)] text-[var(--os-accent-fg)] border-[var(--os-fg)]"
                    : "border-[var(--os-muted)]/20 bg-transparent text-[var(--os-muted)] hover:border-[var(--os-muted)]/40 hover:text-[var(--os-fg)]"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {/* Exams Grid */}
        <section className="mt-6">
          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-card)]">
              <FileText className="mb-4 h-12 w-12 text-[var(--os-muted)]/20" />
              <h3 className="text-base font-bold text-[var(--os-fg)]">Không tìm thấy đề thi</h3>
              <p className="mt-1.5 text-xs text-[var(--os-muted)]">Thử điều chỉnh từ khóa hoặc bộ lọc tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Column 1: Main Exercises */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--os-muted)]/10 pb-3">
                  <h3 className="text-sm font-bold text-[var(--os-accent)] flex items-center gap-2">
                    <span>📘</span> Chuỗi bài tập chính ({mainExams.length})
                  </h3>
                </div>
                {mainExams.length === 0 ? (
                  <div className="p-10 text-center text-xs text-[var(--os-muted)] italic bg-[var(--os-card)]/30 rounded-xl border border-[var(--os-muted)]/10 border-dashed">
                    Không có đề bài tập chính nào.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {mainExams.map((exam) => renderExamCard(exam))}
                  </div>
                )}
              </div>

              {/* Column 2: Advanced Exercises */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--os-muted)]/10 pb-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>⚡</span> Chuỗi luyện đề nâng cao ({advancedExams.length})
                  </h3>
                </div>
                {advancedExams.length === 0 ? (
                  <div className="p-10 text-center text-xs text-[var(--os-muted)] italic bg-[var(--os-card)]/30 rounded-xl border border-[var(--os-muted)]/10 border-dashed">
                    Không có đề luyện tập nâng cao nào.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {advancedExams.map((exam) => renderExamCard(exam))}
                  </div>
                )}
              </div>

            </div>
          )}
        </section>
      </main>

      <TeacherBottomNav />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDeleteExam}
        title="Xóa đề thi?"
        description={`Bạn có chắc chắn muốn xóa đề thi "${deleteTarget?.title}"? Tất cả các bài làm của học sinh và thống kê liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
