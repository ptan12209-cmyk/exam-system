"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Clock, Trophy, CheckCircle2, XCircle, Loader2, Calendar, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

interface Exam { id: string; title: string; total_questions: number; mc_answers: { question: number; answer: string }[] | null; tf_answers: { question: number; a: boolean; b: boolean; c: boolean; d: boolean }[] | null; sa_answers: { question: number; answer: string | number }[] | null; correct_answers: string[] | null }
interface Submission { id: string; student_id: string; score: number; correct_count: number; time_spent: number; submitted_at: string; student_answers: (string | null)[] | null; mc_student_answers: { question: number; answer: string | null }[] | null; tf_student_answers: { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }[] | null; sa_student_answers: { question: number; answer: string }[] | null }
interface Profile { full_name: string | null; email: string | null }

export default function SubmissionDetailPage() {
    const router = useRouter(); const params = useParams(); const examId = params.id as string; const submissionId = params.submissionId as string; const supabase = createClient()
    const [exam, setExam] = useState<Exam | null>(null); const [submission, setSubmission] = useState<Submission | null>(null); const [profile, setProfile] = useState<Profile | null>(null); const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: examData } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single()
            if (!examData) { router.push("/teacher/dashboard"); return }
            setExam(examData)
            const { data: submissionData } = await supabase.from("submissions").select("*").eq("id", submissionId).eq("exam_id", examId).single()
            if (!submissionData) { router.push(`/teacher/exams/${examId}/scores`); return }
            setSubmission(submissionData)
            const { data: profileData } = await supabase.from("profiles").select("full_name, email").eq("id", submissionData.student_id).single()
            setProfile(profileData); setLoading(false)
        }
        fetchData()
    }, [examId, submissionId, router, supabase])

    const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, "0")}` }
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    const getScoreColor = (score: number) => { if (score >= 8) return "text-emerald-600 dark:text-emerald-400"; if (score >= 5) return "text-amber-600 dark:text-amber-400"; return "text-red-600 dark:text-red-400" }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
    if (!exam || !submission) return null

    const mcCorrectAnswers = exam.mc_answers || (exam.correct_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []
    const studentMcAnswers = submission.mc_student_answers || (submission.student_answers?.map((a, i) => ({ question: i + 1, answer: a }))) || []
    const mcCount = mcCorrectAnswers.length; const tfAnswers = exam.tf_answers || []; const saAnswers = exam.sa_answers || []
    const studentTfAnswers = submission.tf_student_answers || []; const studentSaAnswers = submission.sa_student_answers || []

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={`/teacher/exams/${examId}/scores`}><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground bg-card shadow-sm border border-border"><ArrowLeft className="w-5 h-5" /></Button></Link>
                    <div><h1 className="text-2xl font-bold text-foreground">Chi tiết bài làm</h1><p className="text-muted-foreground text-sm mt-1">{exam.title}</p></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="col-span-1 lg:col-span-2 glass-card rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 h-24 relative"><div className="absolute -bottom-10 left-6"><div className="w-20 h-20 rounded-full border-4 border-card bg-card shadow-md flex items-center justify-center"><div className="w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl">{profile?.full_name?.charAt(0) || <User className="w-8 h-8" />}</div></div></div></div>
                        <div className="pt-12 px-6 pb-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div><h2 className="text-xl font-bold text-foreground">{profile?.full_name || "Học sinh"}</h2><div className="flex items-center gap-2 text-muted-foreground text-sm mt-1"><Mail className="w-3.5 h-3.5" />{profile?.email || "Không có email"}</div></div>
                                <div className="p-3 bg-muted/30 rounded-xl border border-border/50 text-center min-w-[100px]"><p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Điểm số</p><div className={cn("text-3xl font-bold", getScoreColor(submission.score))}>{submission.score.toFixed(1)}</div></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
                                <div className="text-center"><div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2"><Trophy className="w-5 h-5" /></div><p className="text-lg font-bold text-foreground">{submission.correct_count}/{exam.total_questions}</p><p className="text-xs text-muted-foreground">Số câu đúng</p></div>
                                <div className="text-center"><div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2"><Clock className="w-5 h-5" /></div><p className="text-lg font-bold text-foreground">{formatTime(submission.time_spent)}</p><p className="text-xs text-muted-foreground">Thời gian làm</p></div>
                                <div className="text-center"><div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-2"><Calendar className="w-5 h-5" /></div><p className="text-sm font-bold text-foreground mt-2">{formatDate(submission.submitted_at)}</p><p className="text-xs text-muted-foreground">Thời gian nộp</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl flex flex-col justify-center p-6 text-center space-y-4">
                        <div className={cn("p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center", (submission.score / 10) >= 0.5 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20")}>
                            {(submission.score / 10) >= 0.5 ? <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" /> : <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />}
                        </div>
                        <div><h3 className="text-lg font-bold text-foreground">{(submission.score / 10) >= 0.8 ? "Xuất sắc!" : (submission.score / 10) >= 0.65 ? "Làm tốt lắm!" : (submission.score / 10) >= 0.5 ? "Đạt yêu cầu" : "Cần cố gắng"}</h3><p className="text-muted-foreground text-sm mt-1">Học sinh đã hoàn thành {Math.round((submission.correct_count / exam.total_questions) * 100)}% bài thi chính xác.</p></div>
                        <Button variant="outline" className="w-full border-border text-muted-foreground mt-2">Gửi nhận xét (Coming soon)</Button>
                    </div>
                </div>

                {mcCorrectAnswers.length > 0 && (
                    <div className="glass-card rounded-2xl mb-6 overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-muted/10"><h3 className="text-base text-foreground font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>Trắc nghiệm ({mcCorrectAnswers.length} câu)</h3></div>
                        <div className="p-6"><div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {mcCorrectAnswers.map((correct, index) => {
                                const studentAnswer = studentMcAnswers.find(a => a.question === correct.question)?.answer; const isCorrect = studentAnswer?.toUpperCase() === correct.answer?.toUpperCase()
                                return (
                                    <div key={index} className={cn("p-3 rounded-xl border flex flex-col items-center", isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800")}>
                                        <div className="flex items-center gap-1.5 mb-2 w-full justify-center border-b border-black/5 dark:border-white/5 pb-2"><span className="text-xs font-semibold text-muted-foreground">Câu {correct.question}</span>{isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />}</div>
                                        <div className="flex flex-col items-center gap-1 w-full">
                                            <div className="flex items-center gap-2 w-full justify-center"><span className="text-xs text-muted-foreground">HS:</span><span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold", isCorrect ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300")}>{studentAnswer || "—"}</span></div>
                                            {!isCorrect && <div className="flex items-center gap-2 w-full justify-center"><span className="text-xs text-muted-foreground">ĐA:</span><span className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">{correct.answer}</span></div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div></div>
                    </div>
                )}

                {tfAnswers.length > 0 && (
                    <div className="glass-card rounded-2xl mb-6 overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-muted/10"><h3 className="text-base text-foreground font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>Đúng/Sai ({tfAnswers.length} câu)</h3></div>
                        <div className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tfAnswers.map((tf, index) => {
                                const studentTf = studentTfAnswers.find(a => a.question === tf.question); const qNum = mcCount + 1 + index
                                return (
                                    <div key={index} className="p-4 bg-muted/20 rounded-xl border border-border/50">
                                        <p className="text-sm font-bold text-foreground mb-3 border-b border-border/30 pb-2">Câu {qNum}</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                                                const correctVal = tf[opt]; const studentVal = studentTf?.[opt]; const isCorrect = studentVal === correctVal
                                                return (<div key={opt} className={cn("p-2 rounded-lg text-center flex flex-col items-center justify-center border", isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800")}><span className="text-xs font-bold text-muted-foreground uppercase mb-1">{opt}</span><div className="flex items-center gap-1"><span className={cn("font-bold text-sm", studentVal ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>{studentVal ? "Đ" : "S"}</span>{!isCorrect && <span className="text-[10px] text-muted-foreground">({correctVal ? "Đ" : "S"})</span>}</div></div>)
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div></div>
                    </div>
                )}

                {saAnswers.length > 0 && (
                    <div className="glass-card rounded-2xl mb-6 overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-muted/10"><h3 className="text-base text-foreground font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-violet-500 rounded-full"></span>Trả lời ngắn ({saAnswers.length} câu)</h3></div>
                        <div className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {saAnswers.map((sa, index) => {
                                const studentSa = studentSaAnswers.find(a => a.question === sa.question); const qNum = mcCount + tfAnswers.length + 1 + index
                                const correctVal = parseFloat(sa.answer.toString().replace(',', '.')); const studentVal = parseFloat(studentSa?.answer?.replace(',', '.') || '0')
                                const tolerance = Math.abs(correctVal) * 0.05; const isCorrect = Math.abs(correctVal - studentVal) <= tolerance
                                return (
                                    <div key={index} className={cn("p-4 rounded-xl border", isCorrect ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" : "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800")}>
                                        <div className="flex items-center justify-between mb-3 border-b border-black/5 dark:border-white/5 pb-2"><span className="text-sm font-bold text-foreground">Câu {qNum}</span>{isCorrect ? <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CheckCircle2 className="w-4 h-4 mr-1" />Đúng</div> : <div className="flex items-center text-red-500 dark:text-red-400 text-xs font-medium"><XCircle className="w-4 h-4 mr-1" />Sai</div>}</div>
                                        <div className="space-y-2 text-sm"><div className="flex justify-between items-center"><span className="text-muted-foreground">Học sinh:</span><span className={cn("font-bold", isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>{studentSa?.answer || "—"}</span></div>{!isCorrect && <div className="flex justify-between items-center pt-2 border-t border-dashed border-red-200 dark:border-red-800"><span className="text-muted-foreground">Đáp án đúng:</span><span className="font-bold text-emerald-700 dark:text-emerald-300">{sa.answer}</span></div>}</div>
                                    </div>
                                )
                            })}
                        </div></div>
                    </div>
                )}

                <div className="flex justify-center mt-8"><Link href={`/teacher/exams/${examId}/scores`}><Button variant="outline" className="border-border text-muted-foreground"><ArrowLeft className="w-4 h-4 mr-2" />Quay lại danh sách</Button></Link></div>
            </div>
        </div>
    )
}
