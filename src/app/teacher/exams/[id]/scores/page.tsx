"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Trophy, Clock, Download, Loader2, CheckCircle2, Medal, Eye, Edit3, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { LiveParticipants } from "@/components/realtime/LiveParticipants"
import { SubmissionFeed } from "@/components/realtime/SubmissionFeed"

interface Exam { id: string; title: string; total_questions: number; duration: number }
interface Submission { id: string; student_id: string; score: number; correct_count: number; time_spent: number; submitted_at: string; profile: { full_name: string | null } }

export default function ExamScoresPage() {
    const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = createClient()
    const [exam, setExam] = useState<Exam | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: examData, error: examError } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single()
            if (examError) console.error("Exam fetch error:", examError)
            if (!examData) {
                const { data: anyExam } = await supabase.from("exams").select("teacher_id").eq("id", examId).single()
                if (anyExam) { setAuthError(`Bạn không có quyền truy cập đề thi này. Đề thi thuộc về giáo viên khác.`) }
                else { router.push("/teacher/dashboard") }
                setLoading(false); return
            }
            setExam(examData)
            const { data: submissionsData } = await supabase.from("submissions").select(`id, student_id, score, correct_count, time_spent, submitted_at`).eq("exam_id", examId).order("score", { ascending: false }).order("time_spent", { ascending: true })
            if (submissionsData && submissionsData.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const studentIds = submissionsData.map((s: any) => s.student_id)
                const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", studentIds)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const merged = submissionsData.map((sub: any) => ({ ...sub, profile: profilesData?.find((p: any) => p.id === sub.student_id) || { full_name: null } }))
                setSubmissions(merged as Submission[])
            }
            setLoading(false)
        }
        fetchData()
    }, [examId, router, supabase])

    const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, "0")}` }
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    const getScoreColor = (score: number) => {
        if (score >= 8) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800"
        if (score >= 5) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800"
    }
    const stats = { total: submissions.length, avg: submissions.length > 0 ? (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1) : "0", passed: submissions.filter(s => s.score >= 5).length, highest: submissions.length > 0 ? Math.max(...submissions.map(s => s.score)).toFixed(1) : "0" }

    const handleExportExcel = async () => {
        const { exportToExcel } = await import("@/lib/excel-export")
        const submissionData = submissions.map((s, i) => ({ index: i + 1, fullName: s.profile?.full_name || "Học sinh", score: s.score, correctCount: s.correct_count, totalQuestions: exam?.total_questions || 0, timeSpent: s.time_spent, submittedAt: s.submitted_at }))
        await exportToExcel({ title: exam?.title || "Bài thi", totalQuestions: exam?.total_questions || 0, duration: exam?.duration || 0 }, submissionData)
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
    if (!exam) return null
    if (authError) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-card rounded-2xl border-red-200 dark:border-red-800 p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
                <h2 className="text-xl font-bold text-foreground mb-2">Không đủ quyền truy cập</h2>
                <p className="text-muted-foreground mb-6">{authError}</p>
                <Link href="/teacher/dashboard"><Button className="w-full gradient-primary text-white border-0">Quay lại Dashboard</Button></Link>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted/30 bg-card shadow-sm border border-border"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div><h1 className="text-2xl font-bold text-foreground">Kết quả thi</h1><p className="text-muted-foreground text-sm mt-1">{exam.title}</p></div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/teacher/exams/${examId}/monitor`}><Button variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Eye className="w-4 h-4 mr-2" />Monitor Live</Button></Link>
                        <Link href={`/teacher/exams/${examId}/edit`}><Button variant="outline" className="border-border text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400"><Edit3 className="w-4 h-4 mr-2" />Sửa đáp án</Button></Link>
                        <Button onClick={() => window.open(`/api/exams/${examId}/export?format=csv`, '_blank')} variant="outline" className="border-border text-muted-foreground"><Download className="w-4 h-4 mr-2" />CSV</Button>
                        <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-4 h-4 mr-2" />Excel</Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[{ icon: Users, color: "indigo", value: stats.total, label: "Đã nộp" }, { icon: Trophy, color: "amber", value: stats.avg, label: "Điểm TB" }, { icon: CheckCircle2, color: "emerald", value: stats.passed, label: "Đạt (≥5)" }, { icon: Medal, color: "violet", value: stats.highest, label: "Cao nhất" }].map(({ icon: Icon, color, value, label }) => (
                        <div key={label} className="glass-card rounded-2xl p-4 text-center">
                            <div className={`w-10 h-10 rounded-full bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center mx-auto mb-3`}><Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} /></div>
                            <p className="text-2xl font-bold text-foreground">{value}</p>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <LiveParticipants examId={examId} />
                    <SubmissionFeed examId={examId} />
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-4 bg-muted/10 border-b border-border/50">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-lg font-bold text-foreground">Danh sách học sinh</h2><p className="text-muted-foreground text-sm mt-1">Xếp theo điểm từ cao đến thấp</p></div>
                            <div className="text-sm text-muted-foreground">{submissions.length} bản ghi</div>
                        </div>
                    </div>
                    {submissions.length === 0 ? (
                        <div className="text-center py-16"><div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-muted-foreground" /></div><p className="text-muted-foreground font-medium">Chưa có học sinh nào nộp bài</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-muted/10 border-b border-border/50 text-left">
                                    {["Hạng", "Học sinh", "Điểm", "Số câu đúng", "Thời gian", "Nộp lúc", "Chi tiết"].map(h => <th key={h} className="p-4 text-xs font-semibold text-muted-foreground uppercase text-center first:w-16 last:w-24">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-border/30">
                                    {submissions.map((sub, index) => (
                                        <tr key={sub.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                                            <td className="p-4 text-center"><span className={cn("w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-sm",
                                                index === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700"
                                                    : index === 1 ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                                                        : index === 2 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
                                                            : "bg-card text-muted-foreground border border-border"
                                            )}>{index + 1}</span></td>
                                            <td className="p-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">{sub.profile?.full_name?.charAt(0) || sub.student_id.charAt(0)}</div><div><p className="font-medium text-foreground">{sub.profile?.full_name || `Học sinh ${sub.student_id.slice(0, 8)}`}</p><p className="text-xs text-muted-foreground font-mono">#{sub.student_id.slice(0, 8)}</p></div></div></td>
                                            <td className="p-4 text-center"><span className={cn("px-3 py-1 rounded-full text-sm font-bold border inline-block min-w-[3rem]", getScoreColor(sub.score))}>{sub.score.toFixed(1)}</span></td>
                                            <td className="p-4 text-center"><div className="inline-flex items-center gap-1 font-medium text-sm"><span className="text-emerald-600 dark:text-emerald-400">{sub.correct_count}</span><span className="text-muted-foreground/30">/</span><span className="text-muted-foreground">{exam.total_questions}</span></div></td>
                                            <td className="p-4 text-center"><div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/30 text-muted-foreground text-xs font-medium border border-border/50"><Clock className="w-3.5 h-3.5" />{formatTime(sub.time_spent)}</div></td>
                                            <td className="p-4 text-right text-muted-foreground text-sm">{formatDate(sub.submitted_at)}</td>
                                            <td className="p-4 text-center"><Link href={`/teacher/exams/${examId}/submissions/${sub.id}`}><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Eye className="w-5 h-5" /></Button></Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
