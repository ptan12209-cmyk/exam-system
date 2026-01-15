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
    AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Question {
    id: string
    content: string
    options: string[]
    correct_answer: string
    difficulty: number
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
            .maybeSingle()  // Use maybeSingle to avoid 406 when no row exists

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

        // Shuffle options for a question (keep track of correct answer)
        const shuffleOptions = (q: Question): Question => {
            const letters = ["A", "B", "C", "D"]
            const originalIndex = letters.indexOf(q.correct_answer)

            // Create array with original indices
            const optionsWithIndex = q.options.map((opt, idx) => ({
                text: opt,
                originalLetter: letters[idx]
            }))

            // Fisher-Yates shuffle
            for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]]
            }

            // Find new position of correct answer
            const newCorrectIndex = optionsWithIndex.findIndex(o => o.originalLetter === q.correct_answer)

            return {
                ...q,
                options: optionsWithIndex.map((o, idx) => {
                    // Replace letter prefix with new letter
                    const newLetter = letters[idx]
                    return o.text.replace(/^[A-D]\./, `${newLetter}.`)
                }),
                correct_answer: letters[newCorrectIndex]
            }
        }

        // Fetch random questions from question bank
        // Get questions by difficulty (10 per level for 40 total)
        const questionsPerLevel = Math.floor(arenaData.total_questions / 4)

        const { data: questionsData, error: questionsError } = await supabase
            .from("questions")
            .select("id, content, options, correct_answer, difficulty")
            .eq("subject", arenaData.subject)
            .limit(arenaData.total_questions * 2)  // Fetch more to allow random selection

        if (questionsError) {
            console.error("Error fetching questions:", questionsError)
        }

        if (questionsData && questionsData.length > 0) {
            // Shuffle and limit questions
            const shuffled = questionsData.sort(() => Math.random() - 0.5)
            const selected = shuffled.slice(0, arenaData.total_questions)
            // Sort by difficulty and shuffle options
            const sorted = selected.sort((a, b) => a.difficulty - b.difficulty)
            setQuestions(sorted.map(shuffleOptions))
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
                const isCorrect = userAnswer === q.correct_answer
                if (isCorrect) correct++
                return {
                    question_id: q.id,
                    answer: userAnswer,
                    correct_answer: q.correct_answer,
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

            // Redirect to results
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
            "text-green-400",
            "text-yellow-400",
            "text-orange-400",
            "text-red-400"
        ]
        return colors[difficulty] || ""
    }

    const answeredCount = Object.keys(answers).length

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (alreadySubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
                    <CardContent className="p-6 text-center">
                        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Bạn đã tham gia đợt thi này</h2>
                        <p className="text-slate-400 mb-6">Mỗi người chỉ được tham gia 1 lần</p>
                        <Button
                            onClick={() => router.push(`/arena/${arenaId}/result`)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                        >
                            Xem kết quả
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!arena || questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Không có câu hỏi</h2>
                        <p className="text-slate-400 mb-6">Ngân hàng câu hỏi chưa có đủ câu hỏi cho môn này</p>
                        <Button
                            onClick={() => router.push("/arena")}
                            variant="outline"
                            className="border-slate-600 text-slate-400"
                        >
                            Quay lại
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const currentQuestion = questions[currentIndex]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Swords className="w-5 h-5 text-purple-400" />
                        <span className="font-semibold text-white">{arena.name}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Progress */}
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">
                                {answeredCount}/{questions.length}
                            </span>
                        </div>

                        {/* Timer */}
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold",
                            timeLeft <= 60
                                ? "bg-red-500/20 text-red-400 animate-pulse"
                                : timeLeft <= 300
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-purple-500/10 text-purple-400"
                        )}>
                            <Clock className="w-4 h-4" />
                            {formatTime(timeLeft)}
                        </div>

                        <Button
                            onClick={() => handleSubmit(false)}
                            disabled={submitting}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-pink-600"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-1" />
                                    Nộp bài
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 grid md:grid-cols-[1fr_200px] gap-6">
                {/* Question */}
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-6">
                        {/* Question Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                                {currentIndex + 1}
                            </div>
                            <div>
                                <span className={cn("text-sm font-medium", getDifficultyColor(currentQuestion.difficulty))}>
                                    {"⭐".repeat(currentQuestion.difficulty)} {getDifficultyLabel(currentQuestion.difficulty)}
                                </span>
                            </div>
                        </div>

                        {/* Question Content */}
                        <div className="text-white text-lg mb-6 leading-relaxed">
                            <MathRenderer content={currentQuestion.content} />
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, idx) => {
                                const optionLetter = ["A", "B", "C", "D"][idx]
                                const isSelected = answers[currentQuestion.id] === optionLetter

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(currentQuestion.id, optionLetter)}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                                            isSelected
                                                ? "border-purple-500 bg-purple-500/10 text-white"
                                                : "border-slate-600 hover:border-slate-500 text-slate-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "inline-flex w-8 h-8 items-center justify-center rounded-lg mr-3 font-bold",
                                            isSelected
                                                ? "bg-purple-500 text-white"
                                                : "bg-slate-700 text-slate-400"
                                        )}>
                                            {optionLetter}
                                        </span>
                                        <MathRenderer content={option.replace(/^[A-D]\.\s*/, "")} className="inline" />
                                    </button>
                                )
                            })}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-6">
                            <Button
                                variant="outline"
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                                className="border-slate-600 text-slate-400"
                            >
                                Câu trước
                            </Button>

                            {currentIndex < questions.length - 1 ? (
                                <Button
                                    onClick={() => setCurrentIndex(prev => prev + 1)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600"
                                >
                                    Câu sau
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                                >
                                    Nộp bài
                                    <Send className="w-4 h-4 ml-1" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Question Navigator */}
                <div className="hidden md:block">
                    <Card className="border-slate-700 bg-slate-800/50 sticky top-20">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-medium text-slate-400 mb-3">Danh sách câu hỏi</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, idx) => (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                                            currentIndex === idx
                                                ? "bg-purple-600 text-white"
                                                : answers[q.id]
                                                    ? "bg-green-600 text-white"
                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="w-3 h-3 rounded bg-green-600" />
                                    <span>Đã trả lời</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <div className="w-3 h-3 rounded bg-slate-700" />
                                    <span>Chưa trả lời</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
