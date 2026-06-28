"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { cn } from "@/lib/utils"
import { LiveParticipants } from "@/components/realtime/LiveParticipants"
import { SubmissionFeed } from "@/components/realtime/SubmissionFeed"
import { ArrowLeft, Users, Trophy, Clock, Download, CheckCircle2, Medal, Eye, Edit3, AlertCircle, ShieldAlert, GraduationCap, RefreshCw } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { NotificationBell } from "@/components/NotificationBell"

import type { Exam, Submission } from "@/types"
interface AuditEntry { student_id: string; action: string; details: Record<string, unknown>; created_at: string }
interface ViolationSummary { total: number; tab_switch: number; webcam: number; audio: number; other: number }

export default function ExamScoresPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const supabase = createClient()
  const [exam, setExam] = useState<Exam | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [violations, setViolations] = useState<Record<string, ViolationSummary>>({})

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: examData } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single()
      if (!examData) {
        const { data: anyExam } = await supabase.from("exams").select("teacher_id").eq("id", examId).single()
        if (anyExam) setAuthError("Bạn không có quyền truy cập đề thi này.")
        else router.push("/teacher/dashboard")
        setLoading(false)
        return
      }
      setExam(examData)
      const { data: submissionsData } = await supabase.from("submissions").select("id, student_id, score, correct_count, time_spent, submitted_at").eq("exam_id", examId).order("score", { ascending: false }).order("time_spent", { ascending: true })
      if (submissionsData?.length) {
        const studentIds = submissionsData.map((s: Submission) => s.student_id)
        const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", studentIds)
        setSubmissions(submissionsData.map((sub: Submission) => ({ ...sub, profile: profilesData?.find((p: { id: string }) => p.id === sub.student_id) || { full_name: null } })))
      }
      const { data: auditData } = await supabase.from("submission_audit_log").select("student_id, action, details, created_at").eq("exam_id", examId)
      if (auditData?.length) {
        const vMap: Record<string, ViolationSummary> = {}
        for (const entry of auditData as AuditEntry[]) {
          if (!vMap[entry.student_id]) vMap[entry.student_id] = { total: 0, tab_switch: 0, webcam: 0, audio: 0, other: 0 }
          const v = vMap[entry.student_id]
          v.total++
          if (entry.action === "tab_switch" || entry.action === "fullscreen_exit") v.tab_switch++
          else if (entry.action === "webcam_violation" || entry.action === "multi_face" || entry.action === "phone_detected") v.webcam++
          else if (entry.action === "audio_violation") v.audio++
          else v.other++
        }
        setViolations(vMap)
      }
      setLoading(false)
    }
    fetchData()
  }, [examId, router, supabase])

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
  const getScoreColor = (score: number) => score >= 8 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : score >= 5 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200"
  const stats = { total: submissions.length, avg: submissions.length ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1) : "0", passed: submissions.filter((s) => s.score >= 5).length, highest: submissions.length ? Math.max(...submissions.map((s) => s.score)).toFixed(1) : "0" }

  const handleExportExcel = async () => { const { exportToExcel } = await import("@/lib/excel-export"); await exportToExcel({ title: exam?.title || "Bài thi", totalQuestions: exam?.total_questions || 0, duration: exam?.duration || 0 }, submissions.map((s, i) => ({ index: i + 1, fullName: s.profile?.full_name || "Học sinh", score: s.score, correctCount: s.correct_count ?? 0, totalQuestions: exam?.total_questions || 0, timeSpent: s.time_spent ?? 0, submittedAt: s.submitted_at }))) }

  if (loading) return <Loading fullPage label="Đang tổng hợp điểm số..." />
  if (authError) return <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4"><div className="max-w-md w-full rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertCircle className="h-8 w-8" /></div><h2 className="mb-2 text-xl font-semibold">Không đủ quyền truy cập</h2><p className="mb-6 text-[hsl(var(--muted-foreground))]">{authError}</p><Link href="/teacher/dashboard"><Button className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">Quay lại Dashboard</Button></Link></div></div>
  if (!exam) return null

  return (
    <TeacherShell onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/80 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="max-w-[180px] truncate text-base font-semibold tracking-tight">{exam.title}</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pt-24 lg:pt-10 pb-24">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"><ArrowLeft className="h-5 w-5" /></Button>
            <div><p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Kết quả thi</p><h1 className="text-2xl font-semibold">{exam.title}</h1></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/teacher/exams/${examId}/monitor`}><Button variant="outline" className="rounded-full"><Eye className="mr-2 h-4 w-4" />Monitor</Button></Link>
            <Link href={`/teacher/exams/${examId}/edit`}><Button variant="outline" className="rounded-full"><Edit3 className="mr-2 h-4 w-4" />Sửa đề</Button></Link>
            <Button variant="outline" onClick={() => window.open(`/api/exams/${examId}/export?format=csv`, "_blank")} className="rounded-full"><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button onClick={handleExportExcel} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Download className="mr-2 h-4 w-4" />Excel</Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          {[
            { icon: Users, value: stats.total, label: "Đã nộp" },
            { icon: Trophy, value: stats.avg, label: "Điểm TB" },
            { icon: CheckCircle2, value: stats.passed, label: "Đạt (≥5)" },
            { icon: Medal, value: stats.highest, label: "Cao nhất" },
          ].map(({ icon: Icon, value, label }) => <div key={label} className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4"><div className="flex items-center gap-3"><div className="rounded-2xl bg-[hsl(var(--muted))]/20 p-2"><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-semibold">{value}</p><p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p></div></div></div>)}
        </section>

        <div className="grid gap-6 lg:grid-cols-2 mb-6"><LiveParticipants examId={examId} /><SubmissionFeed examId={examId} /></div>

        <section className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5"><div><h2 className="text-lg font-semibold">Danh sách học sinh</h2><p className="text-sm text-[hsl(var(--muted-foreground))]">Xếp theo điểm từ cao đến thấp</p></div><div className="text-sm text-[hsl(var(--muted-foreground))]">{submissions.length} bản ghi</div></div>
          {submissions.length === 0 ? <div className="py-16 text-center text-[hsl(var(--muted-foreground))]"><Users className="mx-auto mb-4 h-12 w-12 opacity-30" />Chưa có học sinh nào nộp bài</div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10 text-left">{["Hạng", "Học sinh", "Điểm", "Số câu đúng", "Thời gian", "Nộp lúc", "Chi tiết"].map((h) => <th key={h} className="p-4 text-center text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">{h}</th>)}</tr></thead><tbody className="divide-y divide-[hsl(var(--border))]/30">{submissions.map((sub, index) => <tr key={sub.id} className="transition-colors hover:bg-[hsl(var(--muted))]/20"><td className="p-4 text-center"><span className="mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold">{index + 1}</span></td><td className="p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-semibold">{sub.profile?.full_name?.charAt(0) || sub.student_id.charAt(0)}</div><div><p className="font-medium"><Link href={`/profile/${sub.student_id}`} className="hover:underline hover:text-indigo-600 transition-colors">{sub.profile?.full_name || `Học sinh ${sub.student_id.slice(0, 8)}`}</Link>{violations[sub.student_id] && <span title={`Vi phạm: ${violations[sub.student_id].total}`} className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600"><ShieldAlert className="h-3 w-3" />{violations[sub.student_id].total}</span>}</p><p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">#{sub.student_id.slice(0, 8)}</p></div></div></td><td className="p-4 text-center"><span className={cn("inline-block min-w-[3rem] rounded-full border px-3 py-1 text-sm font-bold", getScoreColor(sub.score))}>{sub.score.toFixed(1)}</span></td><td className="p-4 text-center text-sm"><span className="text-emerald-600">{sub.correct_count ?? 0}</span>/<span className="text-[hsl(var(--muted-foreground))]">{exam.total_questions}</span></td><td className="p-4 text-center"><span className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/20 px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))]"><Clock className="h-3.5 w-3.5" />{formatTime(sub.time_spent ?? 0)}</span></td><td className="p-4 text-right text-sm text-[hsl(var(--muted-foreground))]">{formatDate(sub.submitted_at)}</td><td className="p-4 text-center"><Link href={`/teacher/exams/${examId}/submissions/${sub.id}`}><Button variant="ghost" size="icon" className="rounded-full"><Eye className="h-5 w-5" /></Button></Link></td></tr>)}</tbody></table></div>}
        </section>
      </main>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
