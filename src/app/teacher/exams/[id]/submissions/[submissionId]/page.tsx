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
import { ArrowLeft, User, Clock, Trophy, CheckCircle2, XCircle, Calendar, Mail, GraduationCap } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

import type { Exam, Submission, Profile } from "@/types"

export default function SubmissionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const submissionId = params.submissionId as string
  const supabase = createClient()
  const [exam, setExam] = useState<Exam | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [teacherProfile, setTeacherProfile] = useState<{ full_name: string | null } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: tp } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      setTeacherProfile(tp)
      const { data: examData } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single()
      if (!examData) { router.push("/teacher/dashboard"); return }
      setExam(examData)
      const { data: submissionData } = await supabase.from("submissions").select("*").eq("id", submissionId).eq("exam_id", examId).single()
      if (!submissionData) { router.push(`/teacher/exams/${examId}/scores`); return }
      setSubmission(submissionData)
      const { data: profileData } = await supabase.from("profiles").select("full_name, email").eq("id", submissionData.student_id).single()
      setProfile(profileData)
      setLoading(false)
    }
    fetchData()
  }, [examId, submissionId, router, supabase])

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const getScoreColor = (score: number) => score >= 8 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-rose-500"
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang tải chi tiết bài làm..." />
  if (!exam || !submission) return null

  const mcCorrectAnswers = exam.mc_answers || (exam.correct_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []
  const studentMcAnswers = submission.mc_student_answers || (submission.student_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []
  const tfAnswers = exam.tf_answers || []
  const saAnswers = exam.sa_answers || []
  const studentTfAnswers = submission.tf_student_answers || []
  const studentSaAnswers = submission.sa_student_answers || []

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href={`/teacher/exams/${examId}/scores`} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="max-w-[180px] truncate text-base font-semibold tracking-tight">Chi tiết bài nộp</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={teacherProfile?.full_name || ""} onLogout={handleLogout} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 lg:px-8 lg:py-10">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent transition-transform active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Submission detail</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Chi tiết bài làm</h1>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{exam.title}</p>
          </div>
        </div>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="h-28 bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))]" />
            <div className="px-8 pb-8 pt-12">
              <div className="-mt-20 mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <div className="flex items-end gap-5">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-[hsl(var(--card))] bg-[hsl(var(--muted))]/20 text-4xl font-semibold shadow-lg">
                    {profile?.full_name?.charAt(0) || <User className="h-10 w-10" />}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl font-bold tracking-tight">{profile?.full_name || "Học sinh"}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                      <Mail className="h-3.5 w-3.5" />{profile?.email || "Chưa cập nhật email"}
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/5 px-6 py-4 text-center shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Điểm số</p>
                  <div className={cn("mt-1 text-4xl font-bold", getScoreColor(submission.score))}>{submission.score.toFixed(1)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t border-[hsl(var(--border))]/40 pt-8">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <p className="text-xl font-bold">{submission.correct_count ?? 0}/{exam.total_questions}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Câu đúng</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="text-xl font-bold">{formatTime(submission.time_spent ?? 0)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Thời gian</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold sm:text-base">{formatDate(submission.submitted_at).split(' ')[0]}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Ngày nộp</p>
                </div>
              </div>
            </div>
          </div>

          <div className="liquid-glass flex flex-col items-center justify-center rounded-[2rem] p-8 text-center">
            <div className={cn(
              "mb-6 flex h-24 w-24 items-center justify-center rounded-full ring-8 ring-opacity-20", 
              (submission.score / 10) >= 0.5 ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500" : "bg-rose-500/10 text-rose-500 ring-rose-500"
            )}>
              {(submission.score / 10) >= 0.5 ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {(submission.score / 10) >= 0.8 ? "Kết quả xuất sắc!" : (submission.score / 10) >= 0.65 ? "Làm tốt lắm!" : (submission.score / 10) >= 0.5 ? "Đã đạt yêu cầu" : "Cần cố gắng thêm"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Học sinh trả lời chính xác {Math.round(((submission.correct_count ?? 0) / exam.total_questions) * 100)}% tổng số câu hỏi trong bài thi này.
            </p>
            <Button variant="outline" className="mt-8 w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent text-xs font-semibold uppercase tracking-widest">
              Gửi nhận xét qua Email
            </Button>
          </div>
        </section>

        {mcCorrectAnswers.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-6">
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Phần Trắc nghiệm ({mcCorrectAnswers.length} câu)
              </h3>
            </div>
            <div className="p-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {mcCorrectAnswers.map((correct, index) => { 
                const studentAnswer = studentMcAnswers.find((a) => a.question === correct.question)?.answer; 
                const isCorrect = studentAnswer?.toUpperCase() === correct.answer?.toUpperCase(); 
                return (
                  <div key={index} className={cn("rounded-2xl border p-4 transition-colors", isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5")}>
                    <div className="mb-3 flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Câu {correct.question}</span>
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">Học sinh chọn:</span>
                        <span className={cn("font-bold text-sm", isCorrect ? "text-emerald-600" : "text-rose-600")}>{studentAnswer || "—"}</span>
                      </div>
                      {!isCorrect && (
                        <div className="flex items-center justify-between border-t border-rose-500/10 pt-2">
                          <span className="text-[hsl(var(--muted-foreground))]">Đáp án đúng:</span>
                          <span className="font-bold text-sm text-emerald-600">{correct.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {tfAnswers.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-6">
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Phần Đúng/Sai ({tfAnswers.length} câu)
              </h3>
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-2">
              {tfAnswers.map((tf, index) => { 
                const studentTf = studentTfAnswers.find((a) => a.question === tf.question); 
                const qNum = (exam.mc_answers?.length || exam.correct_answers?.length || 0) + 1 + index; 
                return (
                  <div key={index} className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 p-5 hover:bg-[hsl(var(--muted))]/5 transition-colors">
                    <p className="mb-4 border-b border-[hsl(var(--border))]/40 pb-2 text-sm font-bold tracking-tight">CÂU HỎI {qNum}</p>
                    <div className="grid grid-cols-4 gap-3">
                      {(['a', 'b', 'c', 'd'] as const).map((opt) => { 
                        const correctVal = tf[opt]; 
                        const studentVal = studentTf?.[opt]; 
                        const isCorrect = studentVal === correctVal; 
                        return (
                          <div key={opt} className={cn("rounded-xl border p-3 text-center", isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5")}>
                            <p className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">{opt}</p>
                            <p className={cn("mt-1 font-bold", isCorrect ? "text-emerald-600" : "text-rose-600")}>
                              {studentVal === null ? "—" : studentVal ? "Đ" : "S"}
                              {!isCorrect && <span className="ml-1 text-[10px] opacity-60">({correctVal ? "Đ" : "S"})</span>}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {saAnswers.length > 0 && (
          <section className="mb-8 overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-6">
              <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Trả lời ngắn ({saAnswers.length} câu)
              </h3>
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {saAnswers.map((sa, index) => { 
                const studentSa = studentSaAnswers.find((a) => a.question === sa.question); 
                const qNum = (exam.mc_answers?.length || exam.correct_answers?.length || 0) + tfAnswers.length + 1 + index; 
                const correctVal = parseFloat(sa.answer.toString().replace(",", ".")); 
                const studentVal = parseFloat(studentSa?.answer?.replace(",", ".") || "0"); 
                const tolerance = Math.abs(correctVal) * 0.05; 
                const isCorrect = Math.abs(correctVal - studentVal) <= tolerance; 
                return (
                  <div key={index} className={cn("rounded-2xl border p-5 transition-colors", isCorrect ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5")}>
                    <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Câu {qNum}</span>
                      {isCorrect ? <span className="text-[10px] font-bold text-emerald-600 uppercase">Chính xác</span> : <span className="text-[10px] font-bold text-rose-600 uppercase">Chưa đúng</span>}
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[hsl(var(--muted-foreground))]">HS nộp:</span>
                        <span className={cn("font-bold", isCorrect ? "text-emerald-600" : "text-rose-600")}>{studentSa?.answer || "—"}</span>
                      </div>
                      {!isCorrect && (
                        <div className="flex items-center justify-between border-t border-rose-500/10 pt-3">
                          <span className="text-[hsl(var(--muted-foreground))]">Hệ thống:</span>
                          <span className="font-bold text-emerald-600">{sa.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="flex justify-center">
          <Link href={`/teacher/exams/${examId}/scores`}>
            <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 px-8 py-6 text-xs font-semibold uppercase tracking-widest transition-transform active:scale-95">
              <ArrowLeft className="mr-3 h-4 w-4" /> Quay lại danh sách
            </Button>
          </Link>
        </div>
      </main>
      <TeacherBottomNav />
    </TeacherShell>
  )
}
