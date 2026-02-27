"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trophy, CheckCircle2, XCircle, Clock, Home, Loader2, Medal, Share2, RotateCcw, GraduationCap, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateStudentStats } from "@/lib/gamification"
import { XpGainAnimation, LevelUpAnimation } from "@/components/gamification/XpBar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }

interface Exam { id: string; title: string; total_questions: number; correct_answers: string[]; mc_answers?: { question: number; answer: string }[]; tf_answers?: TFAnswer[]; sa_answers?: SAAnswer[]; score_visibility_mode?: string; score_visibility_threshold?: number }
interface Submission { id: string; student_answers: string[]; score: number; correct_count: number; time_spent: number; submitted_at: string; mc_correct?: number; tf_correct?: number; sa_correct?: number; mc_student_answers?: { question: number; answer: string }[]; tf_student_answers?: TFStudentAnswer[]; sa_student_answers?: SAStudentAnswer[] }
interface LeaderboardEntry { id: string; score: number; time_spent: number; profile: { full_name: string | null } }

export default function ExamResultPage() {
    const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = createClient()
    const [exam, setExam] = useState<Exam | null>(null); const [submission, setSubmission] = useState<Submission | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); const [loading, setLoading] = useState(true); const [fullName, setFullName] = useState("")
    const [xpGained, setXpGained] = useState<number | null>(null); const [showLevelUp, setShowLevelUp] = useState(false); const [newLevel, setNewLevel] = useState(1)
    const [canRetake, setCanRetake] = useState(false); const [attemptsUsed, setAttemptsUsed] = useState(0); const [maxAttempts, setMaxAttempts] = useState(1)
    const [canViewScore, setCanViewScore] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
            if (profile) setFullName(profile.full_name || "")
            const { data: examData } = await supabase.from("exams").select("*").eq("id", examId).single()
            if (!examData) { router.push("/student/dashboard"); return }
            setExam(examData); const examMaxAttempts = examData.max_attempts ?? 1; setMaxAttempts(examMaxAttempts)
            const { data: allSubmissions, count } = await supabase.from("submissions").select("*", { count: "exact" }).eq("exam_id", examId).eq("student_id", user.id).order("score", { ascending: false })
            if (!allSubmissions || allSubmissions.length === 0) { router.push(`/student/exams/${examId}/take`); return }
            setSubmission(allSubmissions[0]); setAttemptsUsed(count ?? allSubmissions.length)
            if (examMaxAttempts === 0 || (count ?? 0) < examMaxAttempts) setCanRetake(true)
            const scoreVisMode = examData.score_visibility_mode || 'always'; const scoreThresh = examData.score_visibility_threshold || 0
            setCanViewScore(scoreVisMode === 'always' || (scoreVisMode === 'threshold' && allSubmissions[0].score >= scoreThresh))
            const { data: leaderboardData } = await supabase.from("submissions").select("id, score, time_spent, student_id, profile:profiles(full_name)").eq("exam_id", examId).order("score", { ascending: false }).order("time_spent", { ascending: true }).limit(10)
            if (leaderboardData) {
                const transformedData = leaderboardData.map((item: { id: string, score: number, time_spent: number, profile: { full_name: string | null } | { full_name: string | null }[] | null }) => {
                    const profileData = Array.isArray(item.profile) ? item.profile[0] : item.profile
                    return { id: item.id, score: item.score, time_spent: item.time_spent, profile: { full_name: profileData?.full_name ?? null } }
                })
                setLeaderboard(transformedData)
            }
            const xpAwardedKey = `xp_awarded_${examId}_${user.id}_${allSubmissions[0].id}`
            if (!localStorage.getItem(xpAwardedKey)) {
                try { const result = await updateStudentStats(user.id, allSubmissions[0].score); setXpGained(result.xpGained); setNewLevel(result.newLevel); if (result.leveledUp) setShowLevelUp(true); localStorage.setItem(xpAwardedKey, "true") }
                catch (err) { console.error("Failed to update stats:", err) }
            }
            setLoading(false)
        }
        fetchData()
    }, [examId, router, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
    const getScoreColor = (score: number) => { if (score >= 9) return "text-emerald-600 dark:text-emerald-400"; if (score >= 8) return "text-emerald-600 dark:text-emerald-400"; if (score >= 6.5) return "text-indigo-600 dark:text-indigo-400"; if (score >= 5) return "text-amber-600 dark:text-amber-400"; return "text-red-600 dark:text-red-400" }
    const getScoreMessage = (score: number) => { if (score >= 9) return "Xuất sắc! 🎉"; if (score >= 8) return "Làm tốt lắm! 👏"; if (score >= 6.5) return "Khá tốt! 👍"; if (score >= 5) return "Đạt yêu cầu"; return "Cần cố gắng thêm" }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" /></div>
    if (!exam || !submission) return null

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {xpGained !== null && xpGained > 0 && <XpGainAnimation xpGained={xpGained} onComplete={() => setXpGained(null)} />}
            {showLevelUp && <LevelUpAnimation newLevel={newLevel} onComplete={() => setShowLevelUp(false)} />}

            <header className="glass-nav sticky top-0 z-50 border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/student/dashboard" className="flex items-center gap-2">
                        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"><GraduationCap className="w-6 h-6 text-white" /></div>
                        <span className="font-bold text-xl text-foreground hidden md:block">ExamHub</span>
                    </Link>
                    <div className="flex items-center gap-3"><NotificationBell /><UserMenu userName={fullName} onLogout={handleLogout} role="student" /></div>
                </div>
            </header>

            <main className="flex-grow w-full max-w-5xl mx-auto px-4 py-8">
                <div className="text-center mb-8"><h1 className="text-2xl font-bold text-foreground mb-2">{exam.title}</h1><p className="text-muted-foreground">Kết quả bài làm của bạn</p></div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {canViewScore ? (<>
                            <div className="glass-card rounded-2xl overflow-hidden relative">
                                <div className={cn("absolute top-0 left-0 w-full h-2", submission.score >= 8 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : submission.score >= 5 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-red-400 to-pink-500")} />
                                <div className="p-8 text-center relative z-10">
                                    <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-muted/30 mb-6 shadow-inner relative">
                                        <Trophy className={cn("w-14 h-14", getScoreColor(submission.score))} />
                                        {submission.score >= 9 && <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>}
                                    </div>
                                    <div className="space-y-2 mb-6"><h2 className={cn("text-6xl font-black tracking-tight", getScoreColor(submission.score))}>{submission.score.toFixed(1)}</h2><p className="text-xl font-medium text-muted-foreground">{getScoreMessage(submission.score)}</p></div>
                                    <div className="flex items-center justify-center gap-4 md:gap-12 py-6 border-t border-border/50">
                                        <div className="text-center"><div className="flex items-center justify-center gap-2 mb-1"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="text-xl font-bold text-foreground">{submission.correct_count}</span></div><p className="text-xs text-muted-foreground uppercase tracking-wide">Câu đúng</p></div>
                                        <div className="w-px h-12 bg-border/50" />
                                        <div className="text-center"><div className="flex items-center justify-center gap-2 mb-1"><XCircle className="w-5 h-5 text-red-500" /><span className="text-xl font-bold text-foreground">{exam.total_questions - submission.correct_count}</span></div><p className="text-xs text-muted-foreground uppercase tracking-wide">Câu sai</p></div>
                                        <div className="w-px h-12 bg-border/50" />
                                        <div className="text-center"><div className="flex items-center justify-center gap-2 mb-1"><Clock className="w-5 h-5 text-indigo-500" /><span className="text-xl font-bold text-foreground">{formatTime(submission.time_spent)}</span></div><p className="text-xs text-muted-foreground uppercase tracking-wide">Thời gian</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-border/50"><h3 className="font-bold text-foreground flex items-center gap-2">Chi tiết bài làm</h3></div>
                                <div className="p-6">
                                    {exam.correct_answers && exam.correct_answers.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Trắc nghiệm</h3>
                                            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                                {exam.correct_answers.map((correct, i) => {
                                                    const studentAnswer = submission.student_answers?.[i]; const isCorrect = studentAnswer === correct
                                                    return (
                                                        <div key={i} className={cn("relative aspect-square flex flex-col items-center justify-center rounded-xl border", isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800")}>
                                                            <span className="text-[10px] text-muted-foreground absolute top-1">{i + 1}</span>
                                                            <span className={cn("font-bold text-lg", isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>{studentAnswer || "-"}</span>
                                                            {!isCorrect && <div className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-sm z-10">{correct}</div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {exam.tf_answers && exam.tf_answers.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Đúng / Sai</h3>
                                            <div className="space-y-3">
                                                {exam.tf_answers.map((tf, i) => {
                                                    const studentTf = submission.tf_student_answers?.find(a => a.question === tf.question)
                                                    return (
                                                        <div key={i} className="p-4 bg-muted/20 rounded-xl border border-border/50">
                                                            <div className="mb-2 font-medium text-foreground"><span>Câu {tf.question}</span></div>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {(['a', 'b', 'c', 'd'] as const).map((sub) => {
                                                                    const correct = tf[sub]; const student = studentTf?.[sub]; const isCorrect = student === correct
                                                                    return (<div key={sub} className={cn("p-2 rounded-lg text-center text-xs relative", isCorrect ? "bg-card border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-card border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400")}><span className="absolute top-1 left-2 text-[10px] text-muted-foreground uppercase">{sub}</span><span className="font-bold block mt-3">{student === true ? "Đúng" : student === false ? "Sai" : "-"}</span>{!isCorrect && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block mt-1">Đáp án: {correct ? "Đúng" : "Sai"}</span>}</div>)
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {exam.sa_answers && exam.sa_answers.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-500"></span>Trả lời ngắn ({exam.sa_answers.length} câu)</h3>
                                            <div className="space-y-3">
                                                {exam.sa_answers.map((sa, i) => {
                                                    const studentSa = submission.sa_student_answers?.find(a => a.question === sa.question)
                                                    const correctVal = parseFloat(sa.answer.toString().replace(',', '.')); const studentVal = studentSa?.answer ? parseFloat(studentSa.answer.replace(',', '.')) : NaN
                                                    const tolerance = Math.abs(correctVal) * 0.05; const isCorrect = !isNaN(studentVal) && Math.abs(correctVal - studentVal) <= tolerance
                                                    return (
                                                        <div key={i} className={cn("p-4 rounded-xl border", isCorrect ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800")}>
                                                            <div className="flex items-center justify-between mb-2"><span className="font-medium text-foreground">Câu {sa.question}</span>{isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}</div>
                                                            <div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-muted-foreground">Câu trả lời:</span><p className={cn("font-bold", isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>{studentSa?.answer || "-"}</p></div><div><span className="text-muted-foreground">Đáp án đúng:</span><p className="font-bold text-emerald-700 dark:text-emerald-400">{sa.answer}</p></div></div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>) : (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-8 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6"><Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" /></div>
                                <h3 className="text-2xl font-bold text-amber-800 dark:text-amber-400 mb-3">Bài làm đã được nộp thành công</h3>
                                <div className="space-y-2 text-amber-700 dark:text-amber-300">
                                    {exam.score_visibility_mode === 'never' ? <p>Giáo viên không cho phép xem điểm cho đề thi này.</p> : <p>Bạn cần đạt tối thiểu <span className="font-bold">{exam.score_visibility_threshold?.toFixed(1)}</span> điểm để xem kết quả.</p>}
                                    <p className="text-sm">Vui lòng liên hệ giáo viên để biết thêm chi tiết.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-4">Thao tác</h3>
                            <div className="space-y-3">
                                {canRetake && <Link href={`/student/exams/${examId}/take`} className="block"><Button className="w-full gradient-primary text-white border-0 shadow-md shadow-indigo-200 dark:shadow-none"><RotateCcw className="w-4 h-4 mr-2" />Làm lại bài thi</Button></Link>}
                                <div className="text-center text-xs text-muted-foreground mb-2">{maxAttempts === 0 ? `Đã làm ${attemptsUsed} lần (Không giới hạn)` : `Đã dùng ${attemptsUsed}/${maxAttempts} lượt làm bài`}</div>
                                <Link href="/student/dashboard" className="block"><Button variant="outline" className="w-full border-border text-muted-foreground"><Home className="w-4 h-4 mr-2" />Về trang chủ</Button></Link>
                                <Button variant="ghost" className="w-full text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400"><Share2 className="w-4 h-4 mr-2" />Chia sẻ kết quả</Button>
                            </div>
                        </div>

                        {canViewScore && (
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                                    <h3 className="text-amber-800 dark:text-amber-400 flex items-center gap-2 text-base font-bold"><Medal className="w-5 h-5 text-amber-600 dark:text-amber-400" />Bảng xếp hạng</h3>
                                </div>
                                <div className="divide-y divide-border/30">
                                    {leaderboard.map((entry, index) => (
                                        <div key={entry.id} className={cn("flex items-center justify-between p-4 hover:bg-muted/20 transition-colors", entry.id === submission.id ? "bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30" : "")}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                                                    index === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" : index === 1 ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" : index === 2 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                                                )}>{index + 1}</div>
                                                <div><p className={cn("text-sm font-medium", entry.id === submission.id ? "text-indigo-700 dark:text-indigo-400" : "text-foreground")}>{entry.profile?.full_name || "Ẩn danh"}{entry.id === submission.id && " (Bạn)"}</p><p className="text-xs text-muted-foreground">{formatTime(entry.time_spent)}</p></div>
                                            </div>
                                            <div className="font-bold text-foreground">{entry.score.toFixed(1)}</div>
                                        </div>
                                    ))}
                                    {leaderboard.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Chưa có bảng xếp hạng</div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
