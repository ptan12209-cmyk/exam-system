"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Clock,
    Send,
    AlertTriangle,
    Loader2,
    FileText,
    ChevronLeft,
    ChevronRight,
    Shield,
    AlertOctagon,
    Maximize
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AntiCheatProvider } from "@/components/exam/AntiCheatProvider"
import { AntiCheatWarning, FullscreenPrompt, ViolationIndicator } from "@/components/exam/AntiCheatUI"
import { createShuffleSeed, shuffleWithMapping } from "@/lib/shuffle"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]

// Type definitions
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    pdf_url: string | null
    // REMOVED: correct_answers, mc_answers, tf_answers, sa_answers - these are SECRET
    // Safe question structures (no answers)
    mc_questions?: { question: number }[]
    tf_questions?: { question: number }[]
    sa_questions?: { question: number }[]
    // Scheduling fields
    is_scheduled?: boolean
    start_time?: string
    end_time?: string
    max_attempts?: number
    attempts_used?: number
}

export default function TakeExamPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const supabase = useMemo(() => createClient(), [])

    // Race condition guard for submit
    const isSubmittingRef = useRef(false)

    const [exam, setExam] = useState<Exam | null>(null)
    const [studentAnswers, setStudentAnswers] = useState<(Option | null)[]>([])

    // Multi-type student answers
    const [tfStudentAnswers, setTfStudentAnswers] = useState<TFStudentAnswer[]>([])
    const [saStudentAnswers, setSaStudentAnswers] = useState<SAStudentAnswer[]>([])
    const [activeTab, setActiveTab] = useState<"mc" | "tf" | "sa">("mc")

    const [timeLeft, setTimeLeft] = useState(0) // seconds
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [startTime] = useState(Date.now())
    const [pdfPage, setPdfPage] = useState(1)
    const [examStarted, setExamStarted] = useState(false)
    const [antiCheatEnabled, setAntiCheatEnabled] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    // Question randomization
    const [mcQuestionOrder, setMcQuestionOrder] = useState<number[]>([])
    const [shuffleEnabled, setShuffleEnabled] = useState(true)

    // Session tracking for ranking
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [isRanked, setIsRanked] = useState(true)
    const [sessionNumber, setSessionNumber] = useState(1)
    const [showSessionChoice, setShowSessionChoice] = useState(false)
    const [existingSession, setExistingSession] = useState<{
        id: string
        answers_snapshot: Record<string, unknown>
        is_ranked: boolean
        session_number: number
    } | null>(null)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)

    // 🐛 FIX BUG-007: Load from localStorage with userId to prevent conflicts
    const LOCAL_STORAGE_KEY = useMemo(() =>
        userId ? `exam_${examId}_${userId}_answers` : `exam_${examId}_answers`,
        [examId, userId]
    )

    useEffect(() => {
        const fetchExam = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Get exam questions via SECURE API (no answer keys exposed)
            const examResponse = await fetch(`/api/exams/${examId}/questions`)

            if (!examResponse.ok) {
                const errorData = await examResponse.json()
                if (examResponse.status === 403) {
                    if (errorData.error === 'Maximum attempts reached') {
                        router.push(`/student/exams/${examId}/result`)
                        return
                    }
                    if (errorData.start_time) {
                        alert(`Đề thi này sẽ mở lúc ${new Date(errorData.start_time).toLocaleString("vi-VN")}`)
                    } else {
                        alert(errorData.error || "Không thể truy cập đề thi")
                    }
                }
                router.push("/student/dashboard")
                return
            }

            const examData = await examResponse.json()

            setExam(examData)
            setTimeLeft(examData.duration * 60)
            setUserId(user.id)

            // Disable anti-cheat if exam has PDF (mobile can't display inline)
            if (examData.pdf_url) {
                setAntiCheatEnabled(false)
            }

            // Check for existing session
            const { data: existingSessionData } = await supabase
                .from("exam_sessions")
                .select("*")
                .eq("exam_id", examId)
                .eq("student_id", user.id)
                .eq("status", "in_progress")
                .order("created_at", { ascending: false })
                .limit(1)
                .single()

            if (existingSessionData) {
                // Found existing session - show choice to continue or restart
                setExistingSession(existingSessionData)
                setShowSessionChoice(true)
                setLoading(false)
                return // Don't continue loading, wait for user choice
            }

            // Check session count to determine if ranked
            const { count: sessionCount } = await supabase
                .from("exam_sessions")
                .select("*", { count: "exact", head: true })
                .eq("exam_id", examId)
                .eq("student_id", user.id)

            const isFirstSession = (sessionCount ?? 0) === 0
            setIsRanked(isFirstSession)
            setSessionNumber((sessionCount ?? 0) + 1)

            // Create new session
            const { data: newSession } = await supabase
                .from("exam_sessions")
                .insert({
                    exam_id: examId,
                    student_id: user.id,
                    session_number: (sessionCount ?? 0) + 1,
                    is_ranked: isFirstSession,
                    status: "in_progress"
                })
                .select()
                .single()

            if (newSession) {
                setSessionId(newSession.id)

                // Register as participant for real-time tracking
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user.id)
                    .single()

                await supabase.from("exam_participants").upsert({
                    exam_id: examId,
                    user_id: user.id,
                    student_name: profile?.full_name || "Học sinh",
                    started_at: new Date().toISOString(),
                    last_active: new Date().toISOString(),
                    status: "active"
                }, { onConflict: "exam_id,user_id" })
            }

            // Create shuffle order for MC questions (consistent per student per exam)
            const mcCount = examData.mc_questions?.length || examData.total_questions || 12
            if (shuffleEnabled) {
                const seed = createShuffleSeed(examId, user.id)
                const indices = Array.from({ length: mcCount }, (_, i) => i)
                const { shuffled } = shuffleWithMapping(indices, seed)
                setMcQuestionOrder(shuffled)
            } else {
                setMcQuestionOrder(Array.from({ length: mcCount }, (_, i) => i))
            }

            // Load saved answers from localStorage
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
            if (saved) {
                const savedData = JSON.parse(saved)
                if (savedData.mc) setStudentAnswers(savedData.mc)
                if (savedData.tf) setTfStudentAnswers(savedData.tf)
                if (savedData.sa) setSaStudentAnswers(savedData.sa)
            } else {
                // Initialize MC answers
                setStudentAnswers(Array(mcCount).fill(null))

                // Initialize TF student answers
                if (examData.tf_questions && examData.tf_questions.length > 0) {
                    const tfInit: TFStudentAnswer[] = examData.tf_questions.map((tf: { question: number }) => ({
                        question: tf.question,
                        a: null, b: null, c: null, d: null
                    }))
                    setTfStudentAnswers(tfInit)
                }

                // Initialize SA student answers
                if (examData.sa_questions && examData.sa_questions.length > 0) {
                    const saInit: SAStudentAnswer[] = examData.sa_questions.map((sa: { question: number }) => ({
                        question: sa.question,
                        answer: ""
                    }))
                    setSaStudentAnswers(saInit)
                }
            }

            setLoading(false)
        }

        fetchExam()
    }, [examId, router, supabase, LOCAL_STORAGE_KEY, shuffleEnabled])

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0 || loading) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // 🐛 FIX BUG-001: Guard against race condition
                    if (!isSubmittingRef.current) {
                        isSubmittingRef.current = true
                        handleSubmit(true) // Auto-submit
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, loading])

    // Auto-save to localStorage
    useEffect(() => {
        if (studentAnswers.length > 0 || tfStudentAnswers.length > 0 || saStudentAnswers.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
                mc: studentAnswers,
                tf: tfStudentAnswers,
                sa: saStudentAnswers
            }))
        }
    }, [studentAnswers, tfStudentAnswers, saStudentAnswers, LOCAL_STORAGE_KEY])

    // Sync to server periodically (every 30s)
    const [syncError, setSyncError] = useState(false)

    useEffect(() => {
        if (!sessionId) return

        const syncInterval = setInterval(async () => {
            try {
                // 🐛 FIX BUG-002: Add error handling for sync
                const { error } = await supabase
                    .from("exam_sessions")
                    .update({
                        answers_snapshot: {
                            mc: studentAnswers,
                            tf: tfStudentAnswers,
                            sa: saStudentAnswers
                        },
                        last_active_at: new Date().toISOString(),
                        tab_switch_count: tabSwitchCount
                    })
                    .eq("id", sessionId)

                if (error) {
                    console.warn("Sync failed:", error.message)
                    setSyncError(true)
                } else {
                    setSyncError(false)
                }
            } catch (err) {
                console.warn("Sync error:", err)
                setSyncError(true)
            }
        }, 30000)

        return () => clearInterval(syncInterval)
    }, [sessionId, studentAnswers, tfStudentAnswers, saStudentAnswers, tabSwitchCount, supabase])

    const handleAnswerSelect = (questionIndex: number, option: Option) => {
        setStudentAnswers(prev => {
            const newAnswers = [...prev]
            newAnswers[questionIndex] = option
            return newAnswers
        })
    }

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (submitting) return
        setSubmitting(true)

        try {
            if (!exam) {
                setSubmitting(false)
                return
            }

            const timeSpent = Math.floor((Date.now() - startTime) / 1000)

            // SECURE SUBMIT: Send answers to server API, server calculates score
            const response = await fetch('/api/exams/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exam_id: examId,
                    mc_answers: studentAnswers,
                    tf_answers: tfStudentAnswers,
                    sa_answers: saStudentAnswers,
                    session_id: sessionId,
                    time_spent: timeSpent,
                    cheat_flags: {
                        tab_switches: tabSwitchCount,
                        multi_browser: false
                    }
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Submission failed')
            }

            // Server returns the score (we don't calculate it client-side anymore)
            const result = await response.json()
            console.log('Submission result:', result)

            localStorage.removeItem(LOCAL_STORAGE_KEY)
            router.push(`/student/exams/${examId}/result`)
        } catch (err) {
            console.error("Submit error:", err)
            alert("Lỗi nộp bài: " + (err instanceof Error ? err.message : 'Unknown error'))
            setSubmitting(false)
        }
    }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, startTime, router, submitting, LOCAL_STORAGE_KEY, sessionId, tabSwitchCount])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const mcAnsweredCount = studentAnswers.filter(a => a !== null).length
    const tfAnsweredCount = tfStudentAnswers.filter(a =>
        a.a !== null || a.b !== null || a.c !== null || a.d !== null
    ).length
    const saAnsweredCount = saStudentAnswers.filter(a => a.answer && a.answer.trim() !== "").length
    const answeredCount = mcAnsweredCount + tfAnsweredCount + saAnsweredCount

    const handleViolation = useCallback((type: string, count: number) => {
        setTabSwitchCount(count)
        if (count >= 5 && isRanked) {
            setIsRanked(false)
            if (sessionId) {
                supabase
                    .from("exam_sessions")
                    .update({ is_ranked: false, tab_switch_count: count })
                    .eq("id", sessionId)
            }
        }
    }, [isRanked, sessionId, supabase])

    const handleMaxViolations = () => {
        handleSubmit(true)
    }

    const handleContinueSession = async () => {
        if (!existingSession) return
        setSessionId(existingSession.id)
        setIsRanked(existingSession.is_ranked)
        setSessionNumber(existingSession.session_number)

        if (existingSession.answers_snapshot) {
            // 🐛 FIX BUG-004: Proper type definition instead of `as any`
            interface AnswerSnapshot {
                mc?: (Option | null)[]
                tf?: TFStudentAnswer[]
                sa?: SAStudentAnswer[]
            }
            const snapshot = existingSession.answers_snapshot as AnswerSnapshot
            if (snapshot.mc) setStudentAnswers(snapshot.mc)
            if (snapshot.tf) setTfStudentAnswers(snapshot.tf)
            if (snapshot.sa) setSaStudentAnswers(snapshot.sa)
        }

        setShowSessionChoice(false)
        setLoading(false)
    }

    const handleRestartSession = async () => {
        if (!userId || !existingSession) return

        await supabase
            .from("exam_sessions")
            .update({ status: "abandoned", is_ranked: false })
            .eq("id", existingSession.id)

        const { data: newSession } = await supabase
            .from("exam_sessions")
            .insert({
                exam_id: examId,
                student_id: userId,
                session_number: existingSession.session_number + 1,
                is_ranked: false,
                status: "in_progress"
            })
            .select()
            .single()

        if (newSession) {
            setSessionId(newSession.id)
            setIsRanked(false)
            setSessionNumber(newSession.session_number)
        }

        if (exam) {
            setStudentAnswers(Array(exam.total_questions).fill(null))
            setTfStudentAnswers([])
            setSaStudentAnswers([])
        }
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        setShowSessionChoice(false)
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!exam) return null

    if (showSessionChoice && existingSession) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-xl">
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Phát hiện phiên làm bài</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Bạn có một phiên làm bài chưa hoàn thành. Bạn muốn tiếp tục hay làm lại từ đầu?
                            </p>
                        </div>

                        {existingSession.is_ranked && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                                <p className="text-sm text-green-700 text-center font-medium">
                                    ⭐ Phiên này ĐƯỢC TÍNH xếp hạng
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                onClick={handleContinueSession}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            >
                                ✅ Tiếp tục làm bài
                            </Button>

                            <Button
                                onClick={handleRestartSession}
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            >
                                🔄 Làm lại từ đầu (Không tính xếp hạng)
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <AntiCheatProvider
            enabled={antiCheatEnabled}
            onMaxViolations={handleMaxViolations}
            onViolation={handleViolation}
        >
            {!examStarted && antiCheatEnabled && (
                <FullscreenPrompt onStart={() => setExamStarted(true)} />
            )}

            {examStarted && <AntiCheatWarning />}

            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col select-none">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm h-16">
                    <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-800 dark:text-white text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                                    {exam.title}
                                </h1>
                                {isRanked ? (
                                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                        <Shield className="w-3 h-3" />
                                        Tính xếp hạng
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <AlertOctagon className="w-3 h-3" />
                                        Không xếp hạng
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Timer */}
                            <div className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold shadow-sm border transition-colors",
                                timeLeft <= 60
                                    ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 animate-pulse"
                                    : timeLeft <= 300
                                        ? "bg-yellow-50 border-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400"
                                        : "bg-white border-gray-100 text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400"
                            )}>
                                <Clock className="w-4 h-4" />
                                {formatTime(timeLeft)}
                            </div>

                            {/* Submit Button */}
                            <Button
                                onClick={() => setShowConfirm(true)}
                                disabled={submitting}
                                className="hidden md:flex bg-green-600 hover:bg-green-700 shadow-md shadow-green-200"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Nộp bài
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left Panel: Review Materials / Question List */}
                    <div className="lg:w-1/2 flex flex-col p-4 overflow-hidden border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
                        {exam.pdf_url ? (
                            <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col bg-gray-50 dark:bg-slate-800">
                                <iframe
                                    src={`${exam.pdf_url}#page=${pdfPage}`}
                                    className="flex-1 w-full bg-white"
                                    title="Đề thi PDF"
                                />
                                <div className="p-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                                        disabled={pdfPage <= 1}
                                        className="border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trang {pdfPage}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage(p => p + 1)}
                                        className="border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                </div>
                                <p className="font-medium text-gray-500 dark:text-gray-400">Không có file đề thi</p>
                                <p className="text-sm">Vui lòng đọc câu hỏi trực tiếp trên phiếu</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Answer Sheet */}
                    <div className="lg:w-1/2 flex flex-col bg-gray-50 dark:bg-slate-950 h-full overflow-hidden">
                        <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm z-20">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="font-bold text-gray-800 dark:text-white text-lg">Phiếu trả lời</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Đã hoàn thành <span className="font-medium text-blue-600 dark:text-blue-400">{answeredCount}</span>/{exam.total_questions} câu
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="w-32 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${(answeredCount / exam.total_questions) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Tiến độ làm bài</p>
                                </div>
                            </div>

                            {/* Answer Type Tabs */}
                            <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("mc")}
                                    className={cn(
                                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                        activeTab === "mc" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    )}
                                >
                                    Trắc nghiệm
                                </button>
                                {exam.tf_questions && exam.tf_questions.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab("tf")}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "tf" ? "bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        )}
                                    >
                                        Đúng/Sai
                                    </button>
                                )}
                                {exam.sa_questions && exam.sa_questions.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab("sa")}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "sa" ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        )}
                                    >
                                        Điền đáp án
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 content-start">
                            {/* Multiple Choice Grid */}
                            {activeTab === "mc" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {Array.from({ length: exam.mc_questions?.length || exam.total_questions }, (_, i) => (
                                            <div key={i} id={`q-${i}`} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Câu {i + 1}</span>
                                                    {studentAnswers[i] && (
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-4 gap-1">
                                                    {OPTIONS.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerSelect(i, option)}
                                                            className={cn(
                                                                "h-8 rounded text-sm font-medium transition-all active:scale-95",
                                                                studentAnswers[i] === option
                                                                    ? "bg-blue-600 text-white shadow-blue-200 dark:shadow-none shadow"
                                                                    : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                            )}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* True/False Grid */}
                            {activeTab === "tf" && exam.tf_questions && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {exam.tf_questions.map((tf: { question: number }, i: number) => {
                                        const studentTf = tfStudentAnswers.find(a => a.question === tf.question) ||
                                            { question: tf.question, a: null, b: null, c: null, d: null }
                                        return (
                                            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center justify-between mb-3 border-b border-gray-50 dark:border-slate-800 pb-2">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">Câu {tf.question}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                        <div key={sub} className="flex items-center justify-between gap-2">
                                                            <span className="text-sm text-gray-500 font-medium uppercase w-4">{sub}</span>
                                                            <div className="flex gap-2 flex-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const newTf = [...tfStudentAnswers]
                                                                        const idx = newTf.findIndex(a => a.question === tf.question)
                                                                        if (idx >= 0) newTf[idx] = { ...newTf[idx], [sub]: true }
                                                                        else newTf.push({ question: tf.question, a: null, b: null, c: null, d: null, [sub]: true })
                                                                        setTfStudentAnswers(newTf)
                                                                    }}
                                                                    className={cn(
                                                                        "flex-1 py-1 rounded text-xs font-medium transition-colors border",
                                                                        studentTf[sub] === true
                                                                            ? "bg-green-100 border-green-200 text-green-700"
                                                                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                                                                    )}
                                                                >
                                                                    Đúng
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const newTf = [...tfStudentAnswers]
                                                                        const idx = newTf.findIndex(a => a.question === tf.question)
                                                                        if (idx >= 0) newTf[idx] = { ...newTf[idx], [sub]: false }
                                                                        else newTf.push({ question: tf.question, a: null, b: null, c: null, d: null, [sub]: false })
                                                                        setTfStudentAnswers(newTf)
                                                                    }}
                                                                    className={cn(
                                                                        "flex-1 py-1 rounded text-xs font-medium transition-colors border",
                                                                        studentTf[sub] === false
                                                                            ? "bg-red-100 border-red-200 text-red-700"
                                                                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                                                                    )}
                                                                >
                                                                    Sai
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Short Answer Grid */}
                            {activeTab === "sa" && exam.sa_questions && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {exam.sa_questions.map((sa: { question: number }, i: number) => {
                                        const studentSa = saStudentAnswers.find(a => a.question === sa.question)
                                        return (
                                            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 w-16">Câu {sa.question}</span>
                                                    <input
                                                        type="text"
                                                        value={studentSa?.answer || ""}
                                                        onChange={(e) => {
                                                            const newSa = [...saStudentAnswers]
                                                            const idx = newSa.findIndex(a => a.question === sa.question)
                                                            if (idx >= 0) newSa[idx] = { ...newSa[idx], answer: e.target.value }
                                                            else newSa.push({ question: sa.question, answer: e.target.value })
                                                            setSaStudentAnswers(newSa)
                                                        }}
                                                        placeholder="Nhập đáp án của bạn..."
                                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-gray-400"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Mobile Submit FAB */}
                <div className="md:hidden fixed bottom-6 right-6 z-50">
                    <Button
                        onClick={() => setShowConfirm(true)}
                        size="icon"
                        className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-300"
                    >
                        <Send className="w-6 h-6 ml-0.5" />
                    </Button>
                </div>

                {/* Confirm Dialog */}
                {showConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-sm bg-white dark:bg-slate-900 border-0 shadow-2xl">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nộp bài thi?</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                                        Bạn đã hoàn thành <span className="font-bold text-gray-800 dark:text-white">{answeredCount}/{exam.total_questions}</span> câu hỏi.
                                    </p>
                                    {answeredCount < exam.total_questions && (
                                        <div className="mt-4 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-lg border border-amber-100 dark:border-amber-900">
                                            ⚠️ Bạn còn {exam.total_questions - answeredCount} câu chưa làm
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowConfirm(false)}
                                        className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    >
                                        Làm tiếp
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmit(false)}
                                        disabled={submitting}
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none shadow-md"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Đang nộp...
                                            </>
                                        ) : (
                                            "Nộp bài ngay"
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AntiCheatProvider>
    )
}
