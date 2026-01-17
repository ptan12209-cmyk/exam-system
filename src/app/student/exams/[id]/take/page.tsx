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
    Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AntiCheatProvider, useAntiCheat } from "@/components/exam/AntiCheatProvider"
import { AntiCheatWarning, FullscreenPrompt, ViolationIndicator } from "@/components/exam/AntiCheatUI"
import { createShuffleSeed, shuffleWithMapping, ShuffleMapping } from "@/lib/shuffle"

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
    }, [examId, router, supabase, LOCAL_STORAGE_KEY])

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

            // Debug log
            console.log("Submitting answers:", {
                studentAnswers,
                tfStudentAnswers,
                saStudentAnswers,
                examTfAnswers: exam.tf_answers,
                examSaAnswers: exam.sa_answers
            })

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

            // Calculate TF score (each correct sub-answer = 0.25 per question)
            let tfCorrect = 0
            const tfTotal = exam.tf_answers?.length || 0
            if (exam.tf_answers) {
                tfStudentAnswers.forEach(studentTf => {
                    const correctTf = exam.tf_answers?.find(t => t.question === studentTf.question)
                    if (correctTf) {
                        let subCorrect = 0
                        if (studentTf.a === correctTf.a) subCorrect++
                        if (studentTf.b === correctTf.b) subCorrect++
                        if (studentTf.c === correctTf.c) subCorrect++
                        if (studentTf.d === correctTf.d) subCorrect++
                        tfCorrect += subCorrect / 4 // Each question worth 1 point max
                    }
                })
            }

            // Calculate SA score (with 5% tolerance)
            let saCorrect = 0
            const saTotal = exam.sa_answers?.length || 0
            if (exam.sa_answers) {
                saStudentAnswers.forEach(studentSa => {
                    const correctSa = exam.sa_answers?.find(s => s.question === studentSa.question)
                    if (correctSa) {
                        const correctVal = parseFloat(correctSa.answer.toString().replace(',', '.'))
                        const studentVal = parseFloat(studentSa.answer.replace(',', '.'))
                        const tolerance = Math.abs(correctVal) * 0.05 // 5% tolerance
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

            // Get current attempt number (avoid count() which causes FOR UPDATE error)
            const { data: existingSubmissions } = await supabase
                .from("submissions")
                .select("id")
                .eq("exam_id", examId)
                .eq("student_id", user.id)

            const attemptNumber = (existingSubmissions?.length ?? 0) + 1

            // Save submission with all answer types
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
                    // Session tracking
                    session_id: sessionId,
                    is_ranked: isRanked,
                    cheat_flags: {
                        tab_switches: tabSwitchCount,
                        multi_browser: false
                    }
                })

            if (error) throw error

            // Mark session as completed
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

            // Update participant status to submitted
            await supabase
                .from("exam_participants")
                .update({ status: "submitted", last_active: new Date().toISOString() })
                .eq("exam_id", examId)
                .eq("user_id", user.id)

            // Clear localStorage
            localStorage.removeItem(LOCAL_STORAGE_KEY)

            // Redirect to result
            router.push(`/student/exams/${examId}/result`)
        } catch (err) {
            console.error("Submit error:", err)
            setSubmitting(false)
        }
    }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, startTime, supabase, router, submitting, LOCAL_STORAGE_KEY, sessionId, isRanked, tabSwitchCount])

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    // Count answered questions across all types
    const mcAnsweredCount = studentAnswers.filter(a => a !== null).length
    // For TF: count as answered if at least one sub-question is answered
    const tfAnsweredCount = tfStudentAnswers.filter(a =>
        a.a !== null || a.b !== null || a.c !== null || a.d !== null
    ).length
    const saAnsweredCount = saStudentAnswers.filter(a => a.answer && a.answer.trim() !== "").length
    const answeredCount = mcAnsweredCount + tfAnsweredCount + saAnsweredCount

    // Handle violation callback to update tabSwitchCount (must be before conditional returns)
    const handleViolation = useCallback((type: string, count: number) => {
        setTabSwitchCount(count)
        // If too many violations, mark as unranked
        if (count >= 5 && isRanked) {
            setIsRanked(false)
            // Update session
            if (sessionId) {
                supabase
                    .from("exam_sessions")
                    .update({ is_ranked: false, tab_switch_count: count })
                    .eq("id", sessionId)
            }
        }
    }, [isRanked, sessionId, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!exam) return null

    // Handle auto-submit on max violations
    const handleMaxViolations = () => {
        handleSubmit(true)
    }

    // Handle continue existing session
    const handleContinueSession = async () => {
        if (!existingSession) return

        setSessionId(existingSession.id)
        setIsRanked(existingSession.is_ranked)
        setSessionNumber(existingSession.session_number)

        // Restore answers from snapshot
        if (existingSession.answers_snapshot) {
            const snapshot = existingSession.answers_snapshot as { mc?: (Option | null)[]; tf?: TFStudentAnswer[]; sa?: SAStudentAnswer[] }
            if (snapshot.mc) setStudentAnswers(snapshot.mc)
            if (snapshot.tf) setTfStudentAnswers(snapshot.tf)
            if (snapshot.sa) setSaStudentAnswers(snapshot.sa)
        }

        setShowSessionChoice(false)
        setLoading(false)
    }

    // Handle restart (new unranked session)
    const handleRestartSession = async () => {
        if (!userId || !existingSession) return

        // Mark old session as abandoned
        await supabase
            .from("exam_sessions")
            .update({ status: "abandoned", is_ranked: false })
            .eq("id", existingSession.id)

        // Create new unranked session
        const { data: newSession } = await supabase
            .from("exam_sessions")
            .insert({
                exam_id: examId,
                student_id: userId,
                session_number: existingSession.session_number + 1,
                is_ranked: false, // Restart = not ranked
                status: "in_progress"
            })
            .select()
            .single()

        if (newSession) {
            setSessionId(newSession.id)
            setIsRanked(false)
            setSessionNumber(newSession.session_number)
        }

        // Clear answers
        setStudentAnswers(Array(exam.total_questions).fill(null))
        setTfStudentAnswers([])
        setSaStudentAnswers([])
        localStorage.removeItem(LOCAL_STORAGE_KEY)

        setShowSessionChoice(false)
        setLoading(false)
    }

    // Show session choice modal
    if (showSessionChoice && existingSession) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
                    <CardContent className="p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto" />
                            <h2 className="text-xl font-bold text-white">Phát hiện phiên làm bài</h2>
                            <p className="text-slate-400">
                                Bạn có một phiên làm bài chưa hoàn thành. Bạn muốn tiếp tục hay làm lại từ đầu?
                            </p>
                        </div>

                        {existingSession.is_ranked && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <p className="text-sm text-green-400 text-center">
                                    ⭐ Phiên này ĐƯỢC TÍNH xếp hạng
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                onClick={handleContinueSession}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                ✅ Tiếp tục làm bài
                            </Button>

                            <Button
                                onClick={handleRestartSession}
                                variant="outline"
                                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                                🔄 Làm lại từ đầu (Không tính xếp hạng)
                            </Button>
                        </div>

                        <p className="text-xs text-slate-500 text-center">
                            Lưu ý: Chỉ phiên làm bài đầu tiên mới được tính xếp hạng
                        </p>
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
            {/* Fullscreen Prompt - Show before exam starts */}
            {!examStarted && antiCheatEnabled && (
                <FullscreenPrompt onStart={() => setExamStarted(true)} />
            )}

            {/* AntiCheat Warning Modal */}
            {examStarted && <AntiCheatWarning />}

            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col select-none">
                {/* Header with Timer */}
                <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                    <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <h1 className="font-semibold text-white truncate max-w-[200px] md:max-w-none">
                                {exam.title}
                            </h1>
                            {/* Ranking Indicator */}
                            {isRanked ? (
                                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                    ⭐ Tính xếp hạng
                                </span>
                            ) : (
                                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                                    Không tính XH
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Progress */}
                            <div className="hidden md:flex items-center gap-2">
                                <span className="text-sm text-slate-400">
                                    {answeredCount}/{exam.total_questions} câu
                                </span>
                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${(answeredCount / exam.total_questions) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Violation Indicator */}
                            {antiCheatEnabled && examStarted && (
                                <ViolationIndicator />
                            )}

                            {/* Timer */}
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold",
                                timeLeft <= 60
                                    ? "bg-red-500/20 text-red-400 animate-pulse"
                                    : timeLeft <= 300
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-blue-500/10 text-blue-400"
                            )}>
                                <Clock className="w-4 h-4" />
                                {formatTime(timeLeft)}
                            </div>

                            {/* Submit Button */}
                            <Button
                                onClick={() => setShowConfirm(true)}
                                disabled={submitting}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Nộp bài
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content - Split Screen */}
                <main className="flex-1 flex flex-col lg:flex-row">
                    {/* Left: PDF Viewer */}
                    <div className="lg:w-1/2 border-r border-slate-700/50 flex flex-col">
                        <div className="flex-1 bg-slate-800/30 flex items-center justify-center p-4">
                            {exam.pdf_url ? (
                                <div className="w-full h-full flex flex-col">
                                    <iframe
                                        src={`${exam.pdf_url}#page=${pdfPage}`}
                                        className="flex-1 w-full rounded-lg bg-white"
                                        title="Đề thi PDF"
                                    />
                                    <div className="flex items-center justify-center gap-4 mt-4">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                                            className="border-slate-600 text-slate-300"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-slate-400 text-sm">Trang {pdfPage}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setPdfPage(p => p + 1)}
                                            className="border-slate-600 text-slate-300"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Không có file PDF đề thi</p>
                                    <p className="text-sm mt-1">Vui lòng xem đáp án ở bên phải</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Answer Sheet */}
                    <div className="lg:w-1/2 flex flex-col bg-slate-900/50">
                        <div className="p-4 border-b border-slate-700/50">
                            <h2 className="font-semibold text-white">Phiếu trả lời</h2>
                            <p className="text-sm text-slate-400">
                                Đã chọn: {answeredCount}/{exam.total_questions} câu
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 p-4 border-b border-slate-700/50">
                            <button
                                onClick={() => setActiveTab("mc")}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === "mc"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                )}
                            >
                                Trắc nghiệm ({exam.mc_answers?.length || exam.total_questions})
                            </button>
                            {exam.tf_answers && exam.tf_answers.length > 0 && (
                                <button
                                    onClick={() => setActiveTab("tf")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        activeTab === "tf"
                                            ? "bg-green-600 text-white"
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                    )}
                                >
                                    Đúng/Sai ({exam.tf_answers.length})
                                </button>
                            )}
                            {exam.sa_answers && exam.sa_answers.length > 0 && (
                                <button
                                    onClick={() => setActiveTab("sa")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                        activeTab === "sa"
                                            ? "bg-purple-600 text-white"
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                    )}
                                >
                                    Trả lời ngắn ({exam.sa_answers.length})
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {/* MC Tab */}
                            {activeTab === "mc" && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                    {Array.from({ length: exam.mc_answers?.length || exam.total_questions }, (_, i) => (
                                        <Card key={i} className="border-slate-700 bg-slate-800/50">
                                            <CardContent className="p-3">
                                                <p className="text-xs text-slate-400 mb-2 text-center">
                                                    Câu {i + 1}
                                                </p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {OPTIONS.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerSelect(i, option)}
                                                            className={cn(
                                                                "py-2 rounded text-sm font-medium transition-all",
                                                                studentAnswers[i] === option
                                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105"
                                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                            )}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* TF Tab */}
                            {activeTab === "tf" && exam.tf_answers && (
                                <div className="space-y-4">
                                    {exam.tf_answers.map((tf, i) => {
                                        const studentTf = tfStudentAnswers.find(a => a.question === tf.question) ||
                                            { question: tf.question, a: null, b: null, c: null, d: null }
                                        return (
                                            <Card key={i} className="border-slate-700 bg-slate-800/50">
                                                <CardContent className="p-4">
                                                    <p className="text-sm font-medium text-slate-300 mb-3">
                                                        Câu {tf.question}
                                                    </p>
                                                    <div className="grid grid-cols-4 gap-3">
                                                        {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                            <div key={sub} className="text-center">
                                                                <p className="text-xs text-slate-500 mb-1">{sub})</p>
                                                                <div className="flex gap-1 justify-center">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newTf = [...tfStudentAnswers]
                                                                            const idx = newTf.findIndex(a => a.question === tf.question)
                                                                            if (idx >= 0) {
                                                                                newTf[idx] = { ...newTf[idx], [sub]: true }
                                                                            } else {
                                                                                newTf.push({ question: tf.question, a: null, b: null, c: null, d: null, [sub]: true })
                                                                            }
                                                                            setTfStudentAnswers(newTf)
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                                                                            studentTf[sub] === true
                                                                                ? "bg-green-600 text-white"
                                                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                                        )}
                                                                    >
                                                                        Đ
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newTf = [...tfStudentAnswers]
                                                                            const idx = newTf.findIndex(a => a.question === tf.question)
                                                                            if (idx >= 0) {
                                                                                newTf[idx] = { ...newTf[idx], [sub]: false }
                                                                            } else {
                                                                                newTf.push({ question: tf.question, a: null, b: null, c: null, d: null, [sub]: false })
                                                                            }
                                                                            setTfStudentAnswers(newTf)
                                                                        }}
                                                                        className={cn(
                                                                            "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                                                                            studentTf[sub] === false
                                                                                ? "bg-red-600 text-white"
                                                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                                        )}
                                                                    >
                                                                        S
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}

                            {/* SA Tab */}
                            {activeTab === "sa" && exam.sa_answers && (
                                <div className="space-y-3">
                                    {exam.sa_answers.map((sa, i) => {
                                        const studentSa = saStudentAnswers.find(a => a.question === sa.question)
                                        return (
                                            <Card key={i} className="border-slate-700 bg-slate-800/50">
                                                <CardContent className="p-4 flex items-center gap-4">
                                                    <p className="text-sm font-medium text-slate-300 w-20">
                                                        Câu {sa.question}
                                                    </p>
                                                    <input
                                                        type="text"
                                                        value={studentSa?.answer || ""}
                                                        onChange={(e) => {
                                                            const newSa = [...saStudentAnswers]
                                                            const idx = newSa.findIndex(a => a.question === sa.question)
                                                            if (idx >= 0) {
                                                                newSa[idx] = { ...newSa[idx], answer: e.target.value }
                                                            } else {
                                                                newSa.push({ question: sa.question, answer: e.target.value })
                                                            }
                                                            setSaStudentAnswers(newSa)
                                                        }}
                                                        placeholder="Nhập đáp án"
                                                        className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Navigation */}
                        <div className="p-4 border-t border-slate-700/50 bg-slate-900/80">
                            <div className="flex flex-wrap gap-1">
                                {Array.from({ length: exam.total_questions }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            document.querySelector(`[data-question="${i}"]`)?.scrollIntoView({ behavior: "smooth" })
                                        }}
                                        className={cn(
                                            "w-8 h-8 rounded text-xs font-medium",
                                            studentAnswers[i] !== null
                                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                : "bg-slate-700/50 text-slate-500"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Confirm Submit Dialog */}
                {showConfirm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-md border-slate-700 bg-slate-800">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-6 h-6 text-yellow-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">Xác nhận nộp bài?</h3>
                                        <p className="text-sm text-slate-400">
                                            Bạn đã làm {answeredCount}/{exam.total_questions} câu
                                        </p>
                                    </div>
                                </div>

                                {answeredCount < exam.total_questions && (
                                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-4">
                                        ⚠️ Còn {exam.total_questions - answeredCount} câu chưa trả lời!
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-slate-600 text-slate-300"
                                        onClick={() => setShowConfirm(false)}
                                    >
                                        Tiếp tục làm bài
                                    </Button>
                                    <Button
                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600"
                                        onClick={() => handleSubmit(false)}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Nộp bài"
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
