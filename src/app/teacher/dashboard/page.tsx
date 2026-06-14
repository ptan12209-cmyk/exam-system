"use client"

import { useEffect, useState } from "react"
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
import { BarChart3, BookOpen, FileText, Users, Clock, Plus, Trash2, Eye } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/components/ui/toast"

interface Profile { id: string; role: string; full_name: string | null }
interface Exam { id: string; title: string; duration: number; total_questions: number; status: "draft" | "published"; created_at: string; submission_count?: number; subject?: string; assigned_to?: "normal" | "x" }

export default function TeacherDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalExams: 0, publishedExams: 0, totalSubmissions: 0 })
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (!profileData) {
        await supabase.auth.signOut()
        return router.push("/login?error=profile_not_found")
      }
      if (profileData.role !== "teacher") return router.push("/student/dashboard")
      setProfile(profileData)
      const { data: examsData } = await supabase.from("exams").select("*, submissions(count)").eq("teacher_id", user.id).order("created_at", { ascending: false })
      if (examsData) {
        const mapped = examsData.map((e: Record<string, unknown>) => ({ ...e, submission_count: Array.isArray(e.submissions) && e.submissions.length ? (e.submissions[0] as { count: number }).count : 0 })) as Exam[]
        setExams(mapped)
        setStats({ totalExams: mapped.length, publishedExams: mapped.filter((e) => e.status === "published").length, totalSubmissions: mapped.reduce((sum, e) => sum + (e.submission_count || 0), 0) })
      }
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  
  const executeDeleteExam = async () => {
    if (!deleteTarget) return

    try {
      const { error } = await supabase.from("exams").delete().eq("id", deleteTarget.id)
      if (error) throw error

      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      setStats((prev) => {
        const deletedExam = exams.find((e) => e.id === deleteTarget.id)
        const isPublished = deletedExam?.status === "published"
        const subCount = deletedExam?.submission_count || 0
        return {
          totalExams: prev.totalExams - 1,
          publishedExams: isPublished ? prev.publishedExams - 1 : prev.publishedExams,
          totalSubmissions: prev.totalSubmissions - subCount
        }
      })
      success("Xóa đề thi thành công!")
    } catch (err: any) {
      console.error("Failed to delete exam:", err)
      toastError(`Xóa đề thi thất bại: ${err.message}`)
    }
  }

  const filteredExams = exams.filter((e) => (selectedSubject === "all" || e.subject === selectedSubject) && e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const subjectOptions = SUBJECTS.filter((s) => exams.some((e) => e.subject === s.value))

  if (loading) return <Loading fullPage label="Đang chuẩn bị dashboard..." />

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/75 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <BarChart3 className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2"><NotificationBell /><UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" /></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <BarChart3 className="h-3.5 w-3.5" /> Teacher dashboard
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight leading-tight md:text-6xl">
              Xin chào, {profile?.full_name || "Thầy/Cô"}
              <span className="mt-3 block max-w-2xl font-serif-italic text-2xl leading-tight tracking-normal text-[hsl(var(--muted-foreground))] md:text-4xl">
                quản lý đề thi rõ ràng hơn.
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Quản lý đề thi, theo dõi bài nộp và điều hành lớp học trong một không gian gọn, rõ, hiện đại.
            </p>
          </div>

          <div className="liquid-glass rounded-[2rem] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng quan nhanh</p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3"><div className="text-2xl font-semibold">{stats.totalExams}</div><div className="text-[hsl(var(--muted-foreground))]">Đề thi</div></div>
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3"><div className="text-2xl font-semibold">{stats.publishedExams}</div><div className="text-[hsl(var(--muted-foreground))]">Đã phát hành</div></div>
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3"><div className="text-2xl font-semibold">{stats.totalSubmissions}</div><div className="text-[hsl(var(--muted-foreground))]">Lượt nộp</div></div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/teacher/monitor" className="liquid-glass rounded-[2rem] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5 border border-violet-500/20"><Eye className="mb-4 h-5 w-5 text-violet-500 animate-pulse" strokeWidth={1.2} /><p className="font-medium">Giám sát học tập</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Quan sát realtime, giao checklist và xem điểm</p></Link>
          <Link href="/teacher/exams/create" className="liquid-glass rounded-[2rem] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"><Plus className="mb-4 h-5 w-5" strokeWidth={1.2} /><p className="font-medium">Tạo đề mới</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Tạo một đề thi mới</p></Link>
          <Link href="/teacher/exam-bank" className="liquid-glass rounded-[2rem] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"><BookOpen className="mb-4 h-5 w-5" strokeWidth={1.2} /><p className="font-medium">Ngân hàng đề</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Lưu trữ và tái sử dụng</p></Link>
          <Link href="/teacher/analytics" className="liquid-glass rounded-[2rem] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"><BarChart3 className="mb-4 h-5 w-5" strokeWidth={1.2} /><p className="font-medium">Thống kê</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Theo dõi kết quả lớp học</p></Link>
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] liquid-glass shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-semibold">Đề thi gần đây</h2><p className="text-sm text-[hsl(var(--muted-foreground))]">Quản lý trạng thái và kết quả</p></div>
            <div className="w-full lg:w-[320px]"><FilterBar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Tìm kiếm đề thi..." className="w-full" /></div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-[hsl(var(--border))]/40 p-4">
            <button onClick={() => setSelectedSubject("all")} className={cn("rounded-full px-4 py-2 text-sm whitespace-nowrap", selectedSubject === "all" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]")}>Tất cả</button>
            {subjectOptions.map((s) => <button key={s.value} onClick={() => setSelectedSubject(s.value)} className={cn("rounded-full px-4 py-2 text-sm whitespace-nowrap", selectedSubject === s.value ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]")}>{s.icon} {s.label}</button>)}
          </div>

          {filteredExams.length === 0 ? (
            <div className="py-16 text-center text-[hsl(var(--muted-foreground))]">Chưa có đề thi phù hợp</div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border))]/40">
              {filteredExams.map((exam) => {
                const subjectInfo = getSubjectInfo(exam.subject || "other")
                return (
                  <div key={exam.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60">
                        {subjectInfo.icon}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{exam.title}</h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]",
                              exam.status === "published"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-amber-200 bg-amber-50 text-amber-700"
                            )}
                          >
                            {exam.status === "published" ? "Đã phát hành" : "Nháp"}
                          </span>
                          {exam.assigned_to === "x" && (
                            <span className="rounded-full border border-[#C18CFF] bg-[#C18CFF]/15 text-[#C18CFF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                              Học sinh X
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {exam.duration} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {exam.total_questions} câu
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {exam.submission_count || 0} lượt nộp
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start lg:self-auto">
                      <Link href={`/teacher/exams/${exam.id}/scores`}>
                        <Button variant="outline" size="sm" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                          Kết quả
                        </Button>
                      </Link>
                      <Link href={`/teacher/exams/${exam.id}/edit`}>
                        <Button variant="outline" size="sm" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                          Sửa
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-500 bg-transparent flex items-center gap-1.5 transition-colors"
                        onClick={() => setDeleteTarget({ id: exam.id, title: exam.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                )
              })}
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
        description={`Bạn có chắc chắn muốn xóa đề thi "${deleteTarget?.title}"? Tất cả bài nộp và dữ liệu liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
