"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MathRenderer } from "@/components/ui/math-renderer"
import {
    Clock,
    Send,
    Loader2,
    Swords,
    Target,
    Trophy,
    ArrowRight,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Circle,
    Flag
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Question {
    id: string
    question_text: string
    options: string[]
    correct_answer: number
}

interface ArenaSession {
    id: string
    name: string
    subject: string
    duration: number
    total_questions: number
    start_time: string
    end_time: string
}

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

    useEffect(() => {
        fetchArenaAndQuestions()
    }, [arenaId])

    const fetchArenaAndQuestions = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/login")
            return
        }
        setUserId(user.id)

        // Check if already submitted
        const { data: existingResult } = await supabase
            .from("arena_results")
            .select("id")
            .eq("arena_id", arenaId)
            .eq("student_id", user.id)
            .maybeSingle()

        if (existingResult) {
            setAlreadySubmitted(true)
            setLoading(false)
            return
        }

        // Fetch arena info
        const { data: arenaData, error: arenaError } = await supabase
            .from("arena_sessions")
            .select("*")
            .eq("id", arenaId)
            .single()

        if (arenaError || !arenaData) {
            router.push("/arena")
            return
        }

        // Check if arena is active
        const now = new Date()
        const start = new Date(arenaData.start_time)
        const end = new Date(arenaData.end_time)

        if (now < start || now > end) {
            alert("Đợt thi này chưa mở hoặc đã kết thúc")
            router.push("/arena")
            return
        }

        setArena(arenaData)
        setTimeLeft(arenaData.duration * 60)

        // Get questions from the exam linked to this arena session
        if (!arenaData.exam_id) {
            console.error("Arena session has no exam_id")
            setLoading(false)
            return
        }

        const { data: questionsData, error: questionsError } = await supabase
            .from("questions")
            .select("id, question_text, options, correct_answer")
            .eq("exam_id", arenaData.exam_id)
            .order("order_index")

        if (questionsError) {
            console.error("Error fetching questions:", questionsError)
        }

        if (questionsData && questionsData.length > 0) {
            // Map to correct format
            const mappedQuestions = questionsData.map((q: any) => ({
                id: q.id,
                question_text: q.question_text,
                options: q.options || ['A', 'B', 'C', 'D'],
                correct_answer: ['A', 'B', 'C', 'D'][q.correct_answer] || 'A'
            }))
            setQuestions(mappedQuestions)
        }

        setLoading(false)
    }

    // Timer
    useEffect(() => {
        if (timeLeft <= 0 || loading || alreadySubmitted) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    handleSubmit(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, loading, alreadySubmitted])

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }))
    }

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting || !arena || !userId) return

        if (!autoSubmit && !confirm("Bạn chắc chắn muốn nộp bài?")) return

        setSubmitting(true)

        try {
            // Calculate score
            let correct = 0
            const answerDetails = questions.map(q => {
                const userAnswer = answers[q.id] || null
                const correctAnswerLetter = ['A', 'B', 'C', 'D'][q.correct_answer] || 'A'
                const isCorrect = userAnswer === correctAnswerLetter
                if (isCorrect) correct++
                return {
                    question_id: q.id,
                    answer: userAnswer,
                    correct_answer: correctAnswerLetter,
                    is_correct: isCorrect
                }
            })

            const score = (correct / questions.length) * 10
            const timeSpent = Math.floor((Date.now() - startTime) / 1000)

            // Save result
            const { error } = await supabase
                .from("arena_results")
                .insert({
                    arena_id: arenaId,
                    student_id: userId,
                    score,
                    correct_count: correct,
                    total_questions: questions.length,
                    time_spent: timeSpent,
                    answers: answerDetails,
                    question_ids: questions.map(q => q.id)
                })

            if (error) throw error

            router.push(`/arena/${arenaId}/result`)
        } catch (err) {
            console.error("Submit error:", err)
            alert("Lỗi nộp bài: " + (err as Error).message)
            setSubmitting(false)
        }
    }, [arena, userId, questions, answers, startTime, arenaId, router, submitting, supabase])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const getDifficultyLabel = (difficulty: number) => {
        const labels = ["", "Dễ", "Trung bình", "Khó", "Rất khó"]
        return labels[difficulty] || ""
    }

    const getDifficultyColor = (difficulty: number) => {
        const colors = [
            "",
            "text-green-600 bg-green-50 border-green-200",
            "text-yellow-600 bg-yellow-50 border-yellow-200",
            "text-orange-600 bg-orange-50 border-orange-200",
            "text-red-600 bg-red-50 border-red-200"
        ]
        return colors[difficulty] || ""
    }

    const answeredCount = Object.keys(answers).length

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (alreadySubmitted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl border-gray-200 dark:border-slate-800">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trophy className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Bạn đã hoàn thành bài thi!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">Kết quả của bạn đã được ghi nhận.</p>
                        <Button
                            onClick={() => router.push(`/arena/${arenaId}/result`)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            Xem kết quả chi tiết
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!arena || questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl border-gray-200 dark:border-slate-800">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Không tìm thấy câu hỏi</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">Hệ thống chưa có đủ dữ liệu câu hỏi cho môn thi này.</p>
                        <Button
                            onClick={() => router.push("/arena")}
                            variant="outline"
                        >
                            Quay lại Đấu trường
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 h-16 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-bold text-gray-800 dark:text-white block text-sm md:text-base">{arena.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 md:hidden">
                                {answeredCount}/{questions.length} câu
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-full border border-gray-100 dark:border-slate-700">
                            <Target className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                Đã làm: <span className="text-blue-600 dark:text-blue-400">{answeredCount}</span>/{questions.length}
                            </span>
                        </div>

                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold border",
                            timeLeft <= 60
                                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 animate-pulse"
                                : timeLeft <= 300
                                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900 text-yellow-600 dark:text-yellow-400"
                                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-blue-600 dark:text-blue-400"
                        )}>
                            <Clock className="w-4 h-4" />
                            {formatTime(timeLeft)}
                        </div>

                        <Button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 hidden md:flex"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Nộp bài
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 grid md:grid-cols-[1fr_240px] gap-6">
                {/* Question Area */}
                <div className="flex flex-col gap-6">
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                        <CardContent className="p-0">
                            {/* Question Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm font-bold text-gray-700 dark:text-gray-300">
                                        Câu {currentIndex + 1}
                                    </div>
                                </div>
                            </div>

                            {/* Question Content */}
                            <div className="p-6 md:p-8">
                                <div className="text-gray-800 dark:text-white text-lg leading-relaxed mb-8">
                                    <MathRenderer content={currentQuestion.question_text} />
                                </div>

                                <div className="grid gap-3">
                                    {currentQuestion.options.map((option, idx) => {
                                        const optionLetter = ["A", "B", "C", "D"][idx]
                                        const isSelected = answers[currentQuestion.id] === optionLetter

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(currentQuestion.id, optionLetter)}
                                                className={cn(
                                                    "w-full p-4 rounded-xl border-2 text-left transition-all relative group",
                                                    isSelected
                                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                                                        : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={cn(
                                                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors",
                                                        isSelected
                                                            ? "bg-blue-500 text-white"
                                                            : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                                    )}>
                                                        {optionLetter}
                                                    </div>
                                                    <div className="flex-1 pt-1">
                                                        <MathRenderer content={option.replace(/^[A-D]\.\s*/, "")} className="inline" />
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                            disabled={currentIndex === 0}
                            className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Câu trước
                        </Button>

                        <div className="hidden md:block text-sm text-gray-400">
                            Câu {currentIndex + 1} / {questions.length}
                        </div>

                        {currentIndex < questions.length - 1 ? (
                            <Button
                                onClick={() => setCurrentIndex(prev => prev + 1)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Câu sau
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                            >
                                Nộp bài
                                <Send className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Question Navigator Sidebar */}
                <div className="hidden md:block">
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 sticky top-20">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Flag className="w-4 h-4" />
                                Tổng quan
                            </h3>

                            <div className="grid grid-cols-5 gap-2 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-1">
                                {questions.map((q, idx) => {
                                    const isAnswered = !!answers[q.id]
                                    const isCurrent = currentIndex === idx

                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={cn(
                                                "aspect-square rounded-lg text-sm font-bold transition-all flex items-center justify-center border",
                                                isCurrent
                                                    ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900"
                                                    : isAnswered
                                                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900"
                                                        : "bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-slate-700 hover:border-blue-300"
                                            )}
                                        >
                                            {idx + 1}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="w-3 h-3 rounded bg-blue-600" />
                                    <span>Đang chọn</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="w-3 h-3 rounded bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900" />
                                    <span>Đã trả lời</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="w-3 h-3 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700" />
                                    <span>Chưa trả lời</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mobile Submit FAB */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <Button
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                    size="icon"
                    className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-300"
                >
                    <Send className="w-6 h-6 ml-1" />
                </Button>
            </div>
        </div>
    )
}
