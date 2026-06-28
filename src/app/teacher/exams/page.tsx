"use client"

import { useEffect, useState, useMemo } from "react"
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
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { FileText, Clock, Plus, Trash2, Users, BarChart3 } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/hooks/useAuth"

import type { Exam } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function TeacherExamsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()
  
  const { user, profile, loading: authLoading, signOut } = useAuth({ requiredRole: "teacher" })
  
  const [exams, setExams] = useState<Exam[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [selectedGrade, setSelectedGrade] = useState<number | string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    if (!user) return
    
    const fetchExamsData = async () => {
      const { data: examsData } = await supabase
        .from("exams")
        .select("*, submissions(count)")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
      if (examsData) {
        const mapped = examsData.map((e: Record<string, any>) => ({
          ...e,
          submission_count: Array.isArray(e.submissions) && e.submissions.length 
            ? e.submissions[0].count 
            : 0
        })) as Exam[]
        setExams(mapped)
      }
      setLoadingExams(false)
    }
    
    fetchExamsData()
  }, [user, supabase])

  const loading = authLoading || loadingExams

  const handleLogout = async () => { await signOut() }
  
  const executeDeleteExam = async () => {
    if (!deleteTarget) return

    try {
      const { error } = await supabase.from("exams").delete().eq("id", deleteTarget.id)
      if (error) throw error

      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      success("Xóa đề thi thành công!")
    } catch (err: any) {
      console.error("Failed to delete exam:", err)
      toastError(`Xóa đề thi thất bại: ${err.message}`)
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
      if (e.is_advanced) {
        adv.push(e)
      } else {
        main.push(e)
      }
    })
    return { mainExams: main, advancedExams: adv }
  }, [filteredExams])

  const subjectOptions = useMemo(() => {
    return SUBJECTS.filter((s) => exams.some((e) => e.subject === s.value))
  }, [exams])

  const renderExamCard = (exam: Exam) => {
    const subjectInfo = getSubjectInfo(exam.subject || "other")
    return (
      <div key={exam.id} className="flex flex-col justify-between p-5 rounded-xl bg-[#15131F] border border-[#8C87A2]/20 hover:border-[#C18CFF]/30 transition-all">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13]">
            <span className="text-xl">{subjectInfo.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-bold leading-tight text-[#F1EDF9] truncate max-w-[200px]" title={exam.title}>
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
                <span className="rounded bg-[#C18CFF]/15 text-[#C18CFF] border border-[#C18CFF]/30 px-1.5 py-0.5 text-[8px] font-bold font-mono uppercase tracking-wider animate-pulse">
                  TSTD
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#8C87A2] font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-[#C18CFF]" />
                {exam.duration} phút
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-[#C18CFF]" />
                {exam.total_questions} câu
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-[#C18CFF]" />
                {exam.submission_count || 0} lượt nộp
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#8C87A2]/10 pt-3">
          <Link href={`/teacher/exams/${exam.id}/scores`}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#8C87A2]/30 bg-transparent text-[10px] font-bold text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF]">
              Kết quả
            </Button>
          </Link>
          <Link href={`/teacher/exams/${exam.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg border-[#8C87A2]/30 bg-transparent text-[10px] font-bold text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF]">
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải danh sách đề thi..." />
      </div>
    )
  }

  return (
    <TeacherShell onLogout={handleLogout} className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8C87A2]/20 bg-[#0B0A13]/90 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/20">
              <BarChart3 className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <span className="text-lg font-bold tracking-tighter">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Header section */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C87A2]">
              <FileText className="h-3.5 w-3.5 text-[#C18CFF]" /> Exam Manager
            </p>
            <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Quản lý đề thi
            </h1>
            <p className="mt-3 text-sm text-[#8C87A2] max-w-xl">
              Danh sách đề thi học sinh làm bài tập chính và chuỗi nâng trình tự luyện nâng cao.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/teacher/exams/create">
              <Button className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] px-5 py-5 text-xs font-bold shadow-md">
                <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} /> Soạn đề mới
              </Button>
            </Link>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="mt-8 rounded-xl border border-[#8C87A2]/20 bg-[#15131F] p-4 flex flex-col gap-4">
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
                    ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF]" 
                    : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#8C87A2]/40"
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
                      ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF]" 
                      : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#8C87A2]/40"
                  )}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-[#8C87A2]/10 pt-3">
            <span className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono mr-2">Khối lớp:</span>
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
                key={g.value}
                onClick={() => setSelectedGrade(g.value)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-[10px] font-bold whitespace-nowrap transition-colors border",
                  selectedGrade === g.value
                    ? "bg-[#F1EDF9] text-[#0B0A13] border-[#F1EDF9]"
                    : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:border-[#8C87A2]/40 hover:text-[#F1EDF9]"
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
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-[#8C87A2]/20 bg-[#15131F]">
              <FileText className="mb-4 h-12 w-12 text-[#8C87A2]/20" />
              <h3 className="text-base font-bold text-[#F1EDF9]">Không tìm thấy đề thi</h3>
              <p className="mt-1.5 text-xs text-[#8C87A2]">Thử điều chỉnh từ khóa hoặc bộ lọc tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Column 1: Main Exercises */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-3">
                  <h3 className="text-sm font-bold text-[#C18CFF] flex items-center gap-2">
                    <span>📘</span> Chuỗi bài tập chính ({mainExams.length})
                  </h3>
                </div>
                {mainExams.length === 0 ? (
                  <div className="p-10 text-center text-xs text-[#8C87A2] italic bg-[#15131F]/30 rounded-xl border border-[#8C87A2]/10 border-dashed">
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
                <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-3">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <span>⚡</span> Chuỗi luyện đề nâng cao ({advancedExams.length})
                  </h3>
                </div>
                {advancedExams.length === 0 ? (
                  <div className="p-10 text-center text-xs text-[#8C87A2] italic bg-[#15131F]/30 rounded-xl border border-[#8C87A2]/10 border-dashed">
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
