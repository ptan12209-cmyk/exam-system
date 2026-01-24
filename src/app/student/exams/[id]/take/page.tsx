"use client"

import { useEffect, useState, useCallback } from "react"
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
    correct_answers: string[]
    // New multi-type fields
    mc_answers?: { question: number; answer: string }[]
    tf_answers?: TFAnswer[]
    sa_answers?: SAAnswer[]
    // Scheduling fields
    is_scheduled?: boolean
    start_time?: string
    end_time?: string
    max_attempts?: number
}

export default function TakeExamPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const supabase = createClient()

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

    // Load from localStorage
    const LOCAL_STORAGE_KEY = `exam_${examId}_answers`

    useEffect(() => {
        const fetchExam = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Get exam first to check max_attempts
            const { data: examData, error } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .eq("status", "published")
                .single()

            if (error || !examData) {
                router.push("/student/dashboard")
                return
            }

            // Check if exam is scheduled and within time window
            if (examData.is_scheduled) {
                const now = new Date()
                if (examData.start_time && new Date(examData.start_time) > now) {
                    alert(`Đề thi này sẽ mở lúc ${new Date(examData.start_time).toLocaleString("vi-VN")}`)
                    router.push("/student/dashboard")
                    return
                }
                if (examData.end_time && new Date(examData.end_time) < now) {
                    alert("Đề thi này đã hết hạn làm bài")
                    router.push("/student/dashboard")
                    return
                }
            }

            // Check attempt count
            const maxAttempts = examData.max_attempts ?? 1
            const { count: attemptCount } = await supabase
                .from("submissions")
                .select("id", { count: "exact", head: true })
                .eq("exam_id", examId)
                .eq("student_id", user.id)

            // If max_attempts is not 0 (unlimited) and attempts exceeded, redirect to result
            if (maxAttempts !== 0 && (attemptCount ?? 0) >= maxAttempts) {
                router.push(`/student/exams/${examId}/result`)
                return
            }

            setExam(examData)
            setTimeLeft(examData.duration * 60)
            setUserId(user.id)

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
            const mcCount = examData.mc_answers?.length || examData.total_questions || 12
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
                if (examData.tf_answers && examData.tf_answers.length > 0) {
                    const tfInit: TFStudentAnswer[] = examData.tf_answers.map((tf: TFAnswer) => ({
                        question: tf.question,
                        a: null, b: null, c: null, d: null
                    }))
                    setTfStudentAnswers(tfInit)
                }

                // Initialize SA student answers
                if (examData.sa_answers && examData.sa_answers.length > 0) {
                    const saInit: SAStudentAnswer[] = examData.sa_answers.map((sa: SAAnswer) => ({
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
                    handleSubmit(true) // Auto-submit
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
    useEffect(() => {
        if (!sessionId) return

        const syncInterval = setInterval(async () => {
            // Save answers snapshot to session
            await supabase
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
            console.log("Auto-saved to server")
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || !exam) return

            // Calculate MC score
            let mcCorrect = 0
            const mcTotal = exam.mc_answers?.length || exam.correct_answers?.length || 0
            studentAnswers.forEach((answer, i) => {
                if (exam.mc_answers && exam.mc_answers[i]) {
                    if (answer === exam.mc_answers[i].answer) mcCorrect++
                } else if (exam.correct_answers && answer === exam.correct_answers[i]) {
                    mcCorrect++
                }
            })

            // Calculate TF score
            let tfCorrect = 0
            const tfTotal = exam.tf_answers?.length || 0
            if (exam.tf_answers) {
                tfStudentAnswers.forEach(studentTf => {
                    const correctTf = exam.tf_answers?.find((t: TFAnswer) => t.question === studentTf.question)
                    if (correctTf) {
                        let subCorrect = 0
                        if (studentTf.a === correctTf.a) subCorrect++
                        if (studentTf.b === correctTf.b) subCorrect++
                        if (studentTf.c === correctTf.c) subCorrect++
                        if (studentTf.d === correctTf.d) subCorrect++
                        tfCorrect += subCorrect / 4
                    }
                })
            }

            // Calculate SA score
            let saCorrect = 0
            const saTotal = exam.sa_answers?.length || 0
            if (exam.sa_answers) {
                saStudentAnswers.forEach(studentSa => {
                    const correctSa = exam.sa_answers?.find((s: SAAnswer) => s.question === studentSa.question)
                    if (correctSa) {
                        const correctVal = parseFloat(correctSa.answer.toString().replace(',', '.'))
                        const studentVal = parseFloat(studentSa.answer.replace(',', '.'))
                        const tolerance = Math.abs(correctVal) * 0.05
                        if (Math.abs(correctVal - studentVal) <= tolerance) {
                            saCorrect++
                        }
                    }
                })
            }

            const totalQuestions = mcTotal + tfTotal + saTotal
            const totalCorrect = mcCorrect + tfCorrect + saCorrect
            const score = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 10 : 0
            const timeSpent = Math.floor((Date.now() - startTime) / 1000)

            const { count } = await supabase
                .from("submissions")
                .select("*", { count: "exact", head: true })
                .eq("exam_id", examId)
                .eq("student_id", user.id)

            const attemptNumber = (count ?? 0) + 1

            // Save submission
            const { error } = await supabase
                .from("submissions")
                .insert({
                    exam_id: examId,
                    student_id: user.id,
                    student_answers: studentAnswers,
                    mc_student_answers: studentAnswers.map((a, i) => ({ question: i + 1, answer: a })),
                    tf_student_answers: tfStudentAnswers,
                    sa_student_answers: saStudentAnswers,
                    score,
                    correct_count: Math.round(totalCorrect),
                    mc_correct: mcCorrect,
                    tf_correct: Math.round(tfCorrect),
                    sa_correct: saCorrect,
                    submitted_at: new Date().toISOString(),
                    time_spent: timeSpent,
                    attempt_number: attemptNumber,
                    session_id: sessionId,
                    is_ranked: isRanked,
                    cheat_flags: {
                        tab_switches: tabSwitchCount,
                        multi_browser: false
                    }
                })

            if (error) throw error

            if (sessionId) {
                await supabase
                    .from("exam_sessions")
                    .update({
                        status: "completed",
                        ended_at: new Date().toISOString(),
                        time_spent: timeSpent
                    })
                    .eq("id", sessionId)
            }

            await supabase
                .from("exam_participants")
                .update({ status: "submitted", last_active: new Date().toISOString() })
                .eq("exam_id", examId)
                .eq("user_id", user.id)

            localStorage.removeItem(LOCAL_STORAGE_KEY)
            router.push(`/student/exams/${examId}/result`)
        } catch (err) {
            console.error("Submit error:", err)
            setSubmitting(false)
        }
    }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, startTime, supabase, router, submitting, LOCAL_STORAGE_KEY, sessionId, isRanked, tabSwitchCount])

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
            const snapshot = existingSession.answers_snapshot as any
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!exam) return null

    if (showSessionChoice && existingSession) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl">
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Phát hiện phiên làm bài</h2>
                            <p className="text-gray-500 text-sm">
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

            <div className="min-h-screen bg-gray-50 flex flex-col select-none">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm h-16">
                    <div className="max-w-screen-2xl mx-auto px-4 h-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-800 text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                                    {exam.title}
                                </h1>
                                {isRanked ? (
                                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                        <Shield className="w-3 h-3" />
                                        Tính xếp hạng
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
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
                                    ? "bg-red-50 border-red-100 text-red-600 animate-pulse"
                                    : timeLeft <= 300
                                        ? "bg-yellow-50 border-yellow-100 text-yellow-600"
                                        : "bg-white border-gray-100 text-blue-600"
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
                    <div className="lg:w-1/2 flex flex-col p-4 overflow-hidden border-r border-gray-200 bg-white shadow-sm z-10">
                        {exam.pdf_url ? (
                            <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 flex flex-col bg-gray-50">
                                <iframe
                                    src={`${exam.pdf_url}#page=${pdfPage}`}
                                    className="flex-1 w-full bg-white"
                                    title="Đề thi PDF"
                                />
                                <div className="p-2 bg-white border-t border-gray-100 flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                                        disabled={pdfPage <= 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-medium text-gray-600">Trang {pdfPage}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPdfPage(p => p + 1)}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-10 h-10 text-gray-300" />
                                </div>
                                <p className="font-medium text-gray-500">Không có file đề thi</p>
                                <p className="text-sm">Vui lòng đọc câu hỏi trực tiếp trên phiếu</p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Answer Sheet */}
                    <div className="lg:w-1/2 flex flex-col bg-gray-50 h-full overflow-hidden">
                        <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-20">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="font-bold text-gray-800 text-lg">Phiếu trả lời</h2>
                                    <p className="text-sm text-gray-500">
                                        Đã hoàn thành <span className="font-medium text-blue-600">{answeredCount}</span>/{exam.total_questions} câu
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${(answeredCount / exam.total_questions) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Tiến độ làm bài</p>
                                </div>
                            </div>

                            {/* Answer Type Tabs */}
                            <div className="flex p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("mc")}
                                    className={cn(
                                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                        activeTab === "mc" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Trắc nghiệm
                                </button>
                                {exam.tf_answers && exam.tf_answers.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab("tf")}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "tf" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        Đúng/Sai
                                    </button>
                                )}
                                {exam.sa_answers && exam.sa_answers.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab("sa")}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                            activeTab === "sa" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
                                        {Array.from({ length: exam.mc_answers?.length || exam.total_questions }, (_, i) => (
                                            <div key={i} id={`q-${i}`} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-bold text-gray-700">Câu {i + 1}</span>
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
                                                                    ? "bg-blue-600 text-white shadow-blue-200 shadow"
                                                                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
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
                            {activeTab === "tf" && exam.tf_answers && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {exam.tf_answers.map((tf, i) => {
                                        const studentTf = tfStudentAnswers.find(a => a.question === tf.question) ||
                                            { question: tf.question, a: null, b: null, c: null, d: null }
                                        return (
                                            <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                                                    <span className="font-bold text-gray-700">Câu {tf.question}</span>
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
                            {activeTab === "sa" && exam.sa_answers && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {exam.sa_answers.map((sa, i) => {
                                        const studentSa = saStudentAnswers.find(a => a.question === sa.question)
                                        return (
                                            <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="font-bold text-gray-700 w-16">Câu {sa.question}</span>
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
                                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                        <Card className="w-full max-w-sm bg-white border-0 shadow-2xl">
                            <CardContent className="p-6">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                        <FileText className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Nộp bài thi?</h3>
                                    <p className="text-gray-500 mt-2">
                                        Bạn đã hoàn thành <span className="font-bold text-gray-800">{answeredCount}/{exam.total_questions}</span> câu hỏi.
                                    </p>
                                    {answeredCount < exam.total_questions && (
                                        <div className="mt-4 px-4 py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg border border-amber-100">
                                            ⚠️ Bạn còn {exam.total_questions - answeredCount} câu chưa làm
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowConfirm(false)}
                                        className="border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                        Làm tiếp
                                    </Button>
                                    <Button
                                        onClick={() => handleSubmit(false)}
                                        disabled={submitting}
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-green-200 shadow-md"
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
