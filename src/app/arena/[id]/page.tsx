"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { MathRenderer } from "@/components/ui/math-renderer"
import { Clock, Send, Loader2, Swords, Target, Trophy, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Flag } from "lucide-react"
import { cn } from "@/lib/utils"

interface Question { id: string; question_text: string; options: string[]; correct_answer: number }
interface ArenaSession { id: string; name: string; subject: string; duration: number; total_questions: number; start_time: string; end_time: string; exam_id?: string }

export default function ArenaBattlePage() {
    const router = useRouter()
    const params = useParams()
    const arenaId = params.id as string
    const supabase = createClient()
    const [arena, setArena] = useState<ArenaSession | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [currentIndex, setCurrentIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [startTime] = useState(Date.now())
    const [userId, setUserId] = useState<string | null>(null)
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)

    useEffect(() => { fetchArenaAndQuestions() }, [arenaId])

    const fetchArenaAndQuestions = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        setUserId(user.id)
        const { data: existingResult } = await supabase.from("arena_results").select("id").eq("arena_id", arenaId).eq("student_id", user.id).maybeSingle()
        if (existingResult) { setAlreadySubmitted(true); setLoading(false); return }
        const { data: arenaData, error: arenaError } = await supabase.from("arena_sessions").select("*").eq("id", arenaId).single()
        if (arenaError || !arenaData) { router.push("/arena"); return }
        const now = new Date(); const start = new Date(arenaData.start_time); const end = new Date(arenaData.end_time)
        if (now < start || now > end) { alert("Đợt thi này chưa mở hoặc đã kết thúc"); router.push("/arena"); return }
        setArena(arenaData); setTimeLeft(arenaData.duration * 60)
        if (!arenaData.exam_id) { setLoading(false); return }
        const { data: questionsData } = await supabase.from("questions").select("id, question_text, options, correct_answer").eq("exam_id", arenaData.exam_id).order("order_index")
        if (questionsData && questionsData.length > 0) {
            const mappedQuestions = questionsData.map((q: { id: string, question_text: string, options: string[] | null, correct_answer: number }) => ({
                id: q.id, question_text: q.question_text, options: q.options || ['A', 'B', 'C', 'D'], correct_answer: ['A', 'B', 'C', 'D'][q.correct_answer] || 'A'
            }))
            setQuestions(mappedQuestions)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (timeLeft <= 0 || loading || alreadySubmitted) return
        const timer = setInterval(() => { setTimeLeft(prev => { if (prev <= 1) { clearInterval(timer); handleSubmit(true); return 0 } return prev - 1 }) }, 1000)
        return () => clearInterval(timer)
    }, [timeLeft, loading, alreadySubmitted])

    const handleAnswer = (questionId: string, answer: string) => { setAnswers(prev => ({ ...prev, [questionId]: answer })) }

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting || !arena || !userId) return
        if (!autoSubmit && !confirm("Bạn chắc chắn muốn nộp bài?")) return
        setSubmitting(true)
        try {
            let correct = 0
            const answerDetails = questions.map(q => {
                const userAnswer = answers[q.id] || null; const correctAnswerLetter = ['A', 'B', 'C', 'D'][q.correct_answer] || 'A'
                const isCorrect = userAnswer === correctAnswerLetter; if (isCorrect) correct++
                return { question_id: q.id, answer: userAnswer, correct_answer: correctAnswerLetter, is_correct: isCorrect }
            })
            const score = (correct / questions.length) * 10; const timeSpent = Math.floor((Date.now() - startTime) / 1000)
            const { error } = await supabase.from("arena_results").insert({ arena_id: arenaId, student_id: userId, score, correct_count: correct, total_questions: questions.length, time_spent: timeSpent, answers: answerDetails, question_ids: questions.map(q => q.id) })
            if (error) throw error
            router.push(`/arena/${arenaId}/result`)
        } catch (err) { console.error("Submit error:", err); alert("Lỗi nộp bài: " + (err as Error).message); setSubmitting(false) }
    }, [arena, userId, questions, answers, startTime, arenaId, router, submitting, supabase])

    const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` }
    const answeredCount = Object.keys(answers).length

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>

    if (alreadySubmitted) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-card rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><Trophy className="w-10 h-10 text-amber-600 dark:text-amber-400" /></div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Bạn đã hoàn thành bài thi!</h2>
                <p className="text-muted-foreground mb-8">Kết quả của bạn đã được ghi nhận.</p>
                <Button onClick={() => router.push(`/arena/${arenaId}/result`)} className="w-full gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">Xem kết quả chi tiết</Button>
            </div>
        </div>
    )

    if (!arena || questions.length === 0) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-card rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-10 h-10 text-red-500" /></div>
                <h2 className="text-xl font-bold text-foreground mb-2">Không tìm thấy câu hỏi</h2>
                <p className="text-muted-foreground mb-8">Hệ thống chưa có đủ dữ liệu câu hỏi cho môn thi này.</p>
                <Button onClick={() => router.push("/arena")} variant="outline" className="border-border">Quay lại Đấu trường</Button>
            </div>
        </div>
    )

    const currentQuestion = questions[currentIndex]

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="glass-nav sticky top-0 z-50 h-16 border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400"><Swords className="w-5 h-5" /></div>
                        <div><span className="font-bold text-foreground block text-sm md:text-base">{arena.name}</span><span className="text-xs text-muted-foreground md:hidden">{answeredCount}/{questions.length} câu</span></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-full border border-border/50"><Target className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium text-muted-foreground">Đã làm: <span className="text-indigo-600 dark:text-indigo-400">{answeredCount}</span>/{questions.length}</span></div>
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold border",
                            timeLeft <= 60 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 animate-pulse"
                                : timeLeft <= 300 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
                                    : "bg-card border-border text-indigo-600 dark:text-indigo-400"
                        )}><Clock className="w-4 h-4" />{formatTime(timeLeft)}</div>
                        <Button onClick={() => handleSubmit(false)} disabled={submitting} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 hidden md:flex">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Nộp bài</>}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 grid md:grid-cols-[1fr_240px] gap-6">
                <div className="flex flex-col gap-6">
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="px-3 py-1 rounded-xl bg-card border border-border shadow-sm font-bold text-foreground">Câu {currentIndex + 1}</div></div>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="text-foreground text-lg leading-relaxed mb-8"><MathRenderer content={currentQuestion.question_text} /></div>
                            <div className="grid gap-3">
                                {currentQuestion.options.map((option, idx) => {
                                    const optionLetter = ["A", "B", "C", "D"][idx]; const isSelected = answers[currentQuestion.id] === optionLetter
                                    return (
                                        <button key={idx} onClick={() => handleAnswer(currentQuestion.id, optionLetter)} className={cn("w-full p-4 rounded-xl border-2 text-left transition-all relative group",
                                            isSelected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100" : "border-border hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-muted/30 text-foreground"
                                        )}>
                                            <div className="flex items-start gap-4">
                                                <div className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors",
                                                    isSelected ? "bg-indigo-500 text-white" : "bg-muted/50 text-muted-foreground group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                                )}>{optionLetter}</div>
                                                <div className="flex-1 pt-1"><MathRenderer content={option.replace(/^[A-D]\.\s*/, "")} className="inline" /></div>
                                            </div>
                                            {isSelected && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Button variant="outline" onClick={() => setCurrentIndex(prev => prev - 1)} disabled={currentIndex === 0} className="bg-card border-border text-muted-foreground hover:bg-muted/30"><ChevronLeft className="w-4 h-4 mr-2" />Câu trước</Button>
                        <div className="hidden md:block text-sm text-muted-foreground">Câu {currentIndex + 1} / {questions.length}</div>
                        {currentIndex < questions.length - 1
                            ? <Button onClick={() => setCurrentIndex(prev => prev + 1)} className="gradient-primary text-white border-0">Câu sau<ChevronRight className="w-4 h-4 ml-2" /></Button>
                            : <Button onClick={() => handleSubmit(false)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">Nộp bài<Send className="w-4 h-4 ml-2" /></Button>
                        }
                    </div>
                </div>

                <div className="hidden md:block">
                    <div className="glass-card rounded-2xl sticky top-20 p-4">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2"><Flag className="w-4 h-4" />Tổng quan</h3>
                        <div className="grid grid-cols-5 gap-2 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-1">
                            {questions.map((q, idx) => {
                                const isAnswered = !!answers[q.id]; const isCurrent = currentIndex === idx
                                return <button key={q.id} onClick={() => setCurrentIndex(idx)} className={cn("aspect-square rounded-lg text-sm font-bold transition-all flex items-center justify-center border",
                                    isCurrent ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900"
                                        : isAnswered ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                            : "bg-card text-muted-foreground border-border hover:border-indigo-300"
                                )}>{idx + 1}</button>
                            })}
                        </div>
                        <div className="mt-6 pt-4 border-t border-border/50 space-y-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-3 h-3 rounded bg-indigo-600" /><span>Đang chọn</span></div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-3 h-3 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800" /><span>Đã trả lời</span></div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground"><div className="w-3 h-3 rounded bg-card border border-border" /><span>Chưa trả lời</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <Button onClick={() => handleSubmit(false)} disabled={submitting} size="icon" className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30"><Send className="w-6 h-6 ml-1" /></Button>
            </div>
        </div>
    )
}
