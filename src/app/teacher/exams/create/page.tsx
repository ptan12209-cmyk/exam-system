"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Upload,
    FileText,
    Clock,
    Save,
    Eye,
    Loader2,
    CheckCircle2,
    X,
    Wand2,
    Sparkles,
    Calendar,
    HelpCircle,
    Copy,
    Trash,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Camera,
    Mic
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS } from "@/lib/subjects"
import { ExamLinkDialog } from "@/components/ExamLinkDialog"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]

export default function CreateExamPage() {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("other")
    const [duration, setDuration] = useState(15)
    const [maxAttempts, setMaxAttempts] = useState(1)

    // Scheduling
    const [isScheduled, setIsScheduled] = useState(false)
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    // Question type toggles
    const [enableTF, setEnableTF] = useState(false)
    const [enableSA, setEnableSA] = useState(false)

    // Question counts per type
    const [mcCount, setMcCount] = useState(12)
    const [tfCount, setTfCount] = useState(4)
    const [saCount, setSaCount] = useState(6)

    // Legacy support
    const [totalQuestions, setTotalQuestions] = useState(10)
    const [correctAnswers, setCorrectAnswers] = useState<(Option | null)[]>([])

    // New structured answers
    type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
    type SAAnswer = { question: number; answer: number | string }

    const [mcAnswers, setMcAnswers] = useState<(Option | null)[]>([])
    const [tfAnswers, setTfAnswers] = useState<TFAnswer[]>([])
    const [saAnswers, setSaAnswers] = useState<SAAnswer[]>([])

    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const [parsingPdf, setParsingPdf] = useState(false)
    const [parseSuccess, setParseSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<"info" | "answers">("info")
    const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc")

    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000"

    const [sendNotification, setSendNotification] = useState(true)

    // Score visibility settings
    const [scoreVisibilityMode, setScoreVisibilityMode] = useState<'always' | 'never' | 'threshold'>('always')
    const [scoreThreshold, setScoreThreshold] = useState(5.0)

    // Security level
    const [securityLevel, setSecurityLevel] = useState(1)

    // Exam link dialog
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [createdExamId, setCreatedExamId] = useState<string | null>(null)

    const handleTotalQuestionsChange = (value: number) => {
        const newValue = Math.max(1, Math.min(100, value))
        setTotalQuestions(newValue)

        const newAnswers: (Option | null)[] = Array(newValue).fill(null)
        correctAnswers.forEach((answer, i) => {
            if (i < newValue) newAnswers[i] = answer
        })
        setCorrectAnswers(newAnswers)
    }

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== "application/pdf") {
            setError("Chỉ chấp nhận file PDF")
            return
        }

        setPdfFile(file)
        setUploadingPdf(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Chưa đăng nhập")

            const sanitizeFileName = (name: string) => {
                return name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[đĐ]/g, "d")
                    .replace(/[^a-zA-Z0-9._-]/g, "_")
            }
            const safeFileName = sanitizeFileName(file.name)
            const fileName = `${user.id}/${Date.now()}_${safeFileName}`
            const { data, error: uploadError } = await supabase.storage
                .from("exam-pdfs")
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from("exam-pdfs")
                .getPublicUrl(fileName)

            setPdfUrl(publicUrl)
        } catch (err) {
            setError("Lỗi upload file: " + (err as Error).message)
            setPdfFile(null)
        } finally {
            setUploadingPdf(false)
        }
    }

    const parsePdfAnswers = async (fileToUse?: File) => {
        const targetFile = fileToUse || answerPdfFile || pdfFile

        if (!targetFile) {
            setError("Vui lòng upload file PDF đáp án trước")
            return
        }

        setParsingPdf(true)
        setError(null)
        setParseSuccess(false)

        try {
            const formData = new FormData()
            formData.append("file", targetFile)

            const response = await fetch(`${WORKER_URL}/extract-answers`, {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || "Không thể parse PDF")
            }

            const data = await response.json()
            console.log("API Response:", data)

            const mcData = data.multiple_choice || []
            const validMc = mcData.filter((a: string | null) =>
                a && ["A", "B", "C", "D"].includes(a.toUpperCase())
            )
            if (validMc.length > 0) {
                const parsedMc: (Option | null)[] = mcData.map((a: string | null) => {
                    if (a && ["A", "B", "C", "D"].includes(a.toUpperCase())) {
                        return a.toUpperCase() as Option
                    }
                    return null
                }).filter((a: Option | null) => a !== null)
                setMcAnswers(parsedMc)
                setMcCount(parsedMc.length)
                setCorrectAnswers(parsedMc)
                setTotalQuestions(parsedMc.length)
            }

            const parsedMcCount = validMc.length > 0 ? validMc.length : mcCount

            const tfData = data.true_false || []
            if (tfData.length > 0) {
                const parsedTf: TFAnswer[] = tfData.map((tf: { question: number; answers?: { a: boolean; b: boolean; c: boolean; d: boolean }; a?: boolean; b?: boolean; c?: boolean; d?: boolean }, index: number) => {
                    const correctQNum = parsedMcCount + 1 + index
                    if (tf.answers) {
                        return {
                            question: correctQNum,
                            a: tf.answers.a,
                            b: tf.answers.b,
                            c: tf.answers.c,
                            d: tf.answers.d
                        }
                    } else {
                        return {
                            question: correctQNum,
                            a: tf.a ?? true,
                            b: tf.b ?? true,
                            c: tf.c ?? true,
                            d: tf.d ?? true
                        }
                    }
                })
                setTfAnswers(parsedTf)
                setTfCount(parsedTf.length)
                setEnableTF(true)
            }

            const saData = data.short_answer || []
            if (saData.length > 0) {
                const effectiveTfCount = tfData.length || tfCount
                const parsedSa: SAAnswer[] = saData.map((sa: { question: number; answer: number | string }, index: number) => ({
                    question: parsedMcCount + effectiveTfCount + 1 + index,
                    answer: sa.answer
                }))
                setSaAnswers(parsedSa)
                setSaCount(parsedSa.length)
                setEnableSA(true)
            }

            if (validMc.length > 0 || tfData.length > 0 || saData.length > 0) {
                setParseSuccess(true)
            } else {
                throw new Error("Không tìm thấy đáp án trong PDF")
            }
        } catch (err) {
            setError("Lỗi parse PDF: " + (err as Error).message)
        } finally {
            setParsingPdf(false)
        }
    }

    const handleAnswerSelect = (questionIndex: number, option: Option) => {
        const newAnswers = [...correctAnswers]
        newAnswers[questionIndex] = option
        setCorrectAnswers(newAnswers)
        // Also update mcAnswers if applicable
        if (mcAnswers.length > 0) {
            const newMc = [...mcAnswers]
            newMc[questionIndex] = option
            setMcAnswers(newMc)
        }
    }

    const handleSave = async (publish: boolean = false) => {
        if (!title.trim()) {
            setError("Vui lòng nhập tên đề thi")
            return
        }

        const filledMc = (mcAnswers.length > 0 ? mcAnswers : correctAnswers).filter(a => a !== null).length
        if (filledMc < mcCount && mcCount > 0) {
            setError(`Vui lòng chọn đáp án cho tất cả ${mcCount} câu trắc nghiệm`)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Chưa đăng nhập")

            const mcAnswerObjects = (mcAnswers.length > 0 ? mcAnswers : correctAnswers).map((ans, i) => ({
                question: i + 1,
                answer: ans
            })).filter(a => a.answer !== null)

            let finalTfAnswers: TFAnswer[] = []
            const effectiveTfCount = enableTF ? tfCount : 0
            if (enableTF && tfCount > 0) {
                if (tfAnswers.length === 0) {
                    finalTfAnswers = Array.from({ length: tfCount }, (_, i) => ({
                        question: mcCount + 1 + i,
                        a: true, b: true, c: true, d: true
                    }))
                } else {
                    finalTfAnswers = tfAnswers
                }
            }

            let finalSaAnswers: SAAnswer[] = []
            const effectiveSaCount = enableSA ? saCount : 0
            if (enableSA && saCount > 0) {
                if (saAnswers.length === 0) {
                    finalSaAnswers = Array.from({ length: saCount }, (_, i) => ({
                        question: mcCount + effectiveTfCount + 1 + i,
                        answer: ""
                    }))
                } else {
                    finalSaAnswers = saAnswers
                }
            }

            const { data, error: insertError } = await supabase
                .from("exams")
                .insert({
                    teacher_id: user.id,
                    title: title.trim(),
                    duration,
                    total_questions: mcCount + effectiveTfCount + effectiveSaCount,
                    correct_answers: mcAnswers.length > 0 ? mcAnswers : correctAnswers,
                    mc_answers: mcAnswerObjects,
                    tf_answers: finalTfAnswers,
                    sa_answers: finalSaAnswers,
                    pdf_url: pdfUrl,
                    max_attempts: maxAttempts,
                    status: publish ? "published" : "draft",
                    subject,
                    is_scheduled: isScheduled,
                    start_time: isScheduled && startTime ? new Date(startTime).toISOString() : null,
                    end_time: isScheduled && endTime ? new Date(endTime).toISOString() : null,
                    score_visibility_mode: scoreVisibilityMode,
                    score_visibility_threshold: scoreVisibilityMode === 'threshold' ? scoreThreshold : null,
                    security_level: securityLevel
                })
                .select()
                .single()

            if (insertError) throw insertError

            // Show link dialog after successful creation
            if (data) {
                setCreatedExamId(data.id)
                setShowLinkDialog(true)
            }

            if (publish && sendNotification && data) {
                try {
                    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
                    const { data: students } = await supabase.from("profiles").select("id").eq("role", "student")

                    if (students && students.length > 0) {
                        const notifications = students.map((s: { id: string }) => ({
                            user_id: s.id,
                            title: `📝 Đề thi mới: ${title.trim()}`,
                            message: `${profile?.full_name || "Giáo viên"} đã đăng đề thi mới`,
                            type: "exam",
                            link: `/student/exams/${data.id}/take`,
                            is_read: false
                        }))
                        await supabase.from("notifications").insert(notifications)
                    }
                } catch (notifyErr) {
                    console.error("Failed to create notifications:", notifyErr)
                }
            }

            // Don't auto-redirect, let user close the dialog first
            // router.push("/teacher/dashboard")
        } catch (err) {
            setError("Lỗi lưu đề thi: " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tạo đề thi mới</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {step === "info" ? "Bước 1: Thiết lập thông tin và cấu hình" : "Bước 2: Nhập đáp án chi tiết"}
                        </p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                        step === "info"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            : "bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-slate-700"
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            step === "info" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                        )}>
                            1
                        </div>
                        Thông tin
                    </div>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-slate-700" />
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                        step === "answers"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                            : "bg-white dark:bg-slate-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-slate-700"
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            step === "answers" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                        )}>
                            2
                        </div>
                        Đáp án
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 mb-6 flex items-center gap-3">
                        <X className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {step === "info" ? (
                    <div className="space-y-6">
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-gray-800 dark:text-white">Thông tin cơ bản</CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">
                                    Điền các thông tin bắt buộc cho đề thi
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Subject Selection */}
                                <div className="space-y-3">
                                    <Label className="text-gray-700 dark:text-gray-300 font-medium">Môn học</Label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {SUBJECTS.map((s) => (
                                            <button
                                                key={s.value}
                                                type="button"
                                                onClick={() => setSubject(s.value)}
                                                className={cn(
                                                    "p-3 rounded-xl border transition-all text-sm flex flex-col items-center justify-center gap-2",
                                                    subject === s.value
                                                        ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500`
                                                        : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
                                                )}
                                            >
                                                <span className="text-2xl">{s.icon}</span>
                                                <span className="font-medium text-xs">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-gray-700 dark:text-gray-300 font-medium">Tên đề thi</Label>
                                    <Input
                                        id="title"
                                        placeholder="Ví dụ: Kiểm tra 15 phút Toán - Chương 1"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 focus:border-blue-500 text-gray-900 dark:text-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration" className="text-gray-700 dark:text-gray-300 font-medium">
                                            Thời gian (phút)
                                        </Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="duration"
                                                type="number"
                                                min={1}
                                                max={180}
                                                value={duration}
                                                onChange={(e) => setDuration(Number(e.target.value))}
                                                className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="totalQuestions" className="text-gray-700 dark:text-gray-300 font-medium">
                                            Số câu trắc nghiệm
                                        </Label>
                                        <Input
                                            id="totalQuestions"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={mcCount}
                                            onChange={(e) => {
                                                const val = Number(e.target.value)
                                                setMcCount(val)
                                                handleTotalQuestionsChange(val) // Sync with legacy logic
                                            }}
                                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="maxAttempts" className="text-gray-700 dark:text-gray-300 font-medium">
                                        Số lần làm bài
                                    </Label>
                                    <select
                                        id="maxAttempts"
                                        value={maxAttempts}
                                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                                        className="w-full h-10 px-3 rounded-md bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value={1}>1 lần (không làm lại)</option>
                                        <option value={2}>2 lần</option>
                                        <option value={3}>3 lần</option>
                                        <option value={5}>5 lần</option>
                                        <option value={0}>Không giới hạn</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className={cn(
                                "border transition-all cursor-pointer",
                                isScheduled ? "border-orange-500 shadow-md ring-1 ring-orange-100 dark:ring-orange-900/20 bg-white dark:bg-slate-900" : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                            )}>
                                <div onClick={() => setIsScheduled(!isScheduled)} className="p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-2 rounded-lg", isScheduled ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400")}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white">Giới hạn thời gian</h3>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                            isScheduled ? "bg-orange-500 border-orange-500" : "border-gray-300"
                                        )}>
                                            {isScheduled && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 ml-1">
                                        Học sinh chỉ có thể làm bài trong khoảng thời gian xác định
                                    </p>

                                    {isScheduled && (
                                        <div className="space-y-3 pt-3 border-t border-orange-100" onClick={e => e.stopPropagation()}>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-600 dark:text-gray-400">Bắt đầu từ</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="h-9 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-700"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-600 dark:text-gray-400">Kết thúc lúc</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="h-9 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-700"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <Card className={cn(
                                    "border transition-all cursor-pointer",
                                    enableTF ? "border-green-500 shadow-md ring-1 ring-green-100 dark:ring-green-900/30" : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                                )}>
                                    <div onClick={() => setEnableTF(!enableTF)} className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-2 rounded-lg", enableTF ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400")}>
                                                    <HelpCircle className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold text-gray-800 dark:text-white">Đúng / Sai</h3>
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                enableTF ? "bg-green-500 border-green-500" : "border-gray-300 dark:border-slate-600"
                                            )}>
                                                {enableTF && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Dạng câu hỏi 4 ý chọn Đúng/Sai</p>

                                        {enableTF && (
                                            <div className="mt-4 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                <Label className="text-sm text-gray-700 dark:text-gray-300">Số câu:</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={tfCount}
                                                    onChange={(e) => setTfCount(Math.max(1, Number(e.target.value)))}
                                                    className="w-20 h-9 text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-700"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                <Card className={cn(
                                    "border transition-all cursor-pointer",
                                    enableSA ? "border-purple-500 shadow-md ring-1 ring-purple-100 dark:ring-purple-900/30" : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                                )}>
                                    <div onClick={() => setEnableSA(!enableSA)} className="p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-2 rounded-lg", enableSA ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400")}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <h3 className="font-semibold text-gray-800 dark:text-white">Trả lời ngắn</h3>
                                            </div>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                                enableSA ? "bg-purple-500 border-purple-500" : "border-gray-300 dark:border-slate-600"
                                            )}>
                                                {enableSA && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Dạng điền đáp án ngắn (số, chữ)</p>

                                        {enableSA && (
                                            <div className="mt-4 flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                                <Label className="text-sm text-gray-700 dark:text-gray-300">Số câu:</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={saCount}
                                                    onChange={(e) => setSaCount(Math.max(1, Number(e.target.value)))}
                                                    className="w-20 h-9 text-center bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-700"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {/* Score Visibility Card */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    Hiển thị điểm
                                </CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">
                                    Kiểm soát khi nào học sinh có thể xem kết quả bài làm
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="scoreVisibility" className="text-gray-700 dark:text-gray-300 font-medium">
                                        Chế độ hiển thị
                                    </Label>
                                    <select
                                        id="scoreVisibility"
                                        value={scoreVisibilityMode}
                                        onChange={(e) => setScoreVisibilityMode(e.target.value as 'always' | 'never' | 'threshold')}
                                        className="w-full h-10 px-3 rounded-md bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="always">✅ Luôn cho xem điểm</option>
                                        <option value="never">🔒 Không cho xem điểm</option>
                                        <option value="threshold">📊 Chỉ hiện khi đạt ngưỡng</option>
                                    </select>

                                    {scoreVisibilityMode === 'always' && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            Học sinh sẽ thấy điểm và chi tiết bài làm ngay sau khi nộp
                                        </p>
                                    )}
                                    {scoreVisibilityMode === 'never' && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                            ⚠️ Học sinh sẽ KHÔNG thấy điểm, chi tiết câu trả lời và bảng xếp hạng
                                        </p>
                                    )}
                                    {scoreVisibilityMode === 'threshold' && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                            💡 Chỉ học sinh đạt ngưỡng mới xem được kết quả
                                        </p>
                                    )}
                                </div>

                                {scoreVisibilityMode === 'threshold' && (
                                    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                                        <Label htmlFor="scoreThreshold" className="text-gray-700 dark:text-gray-300 font-medium">
                                            Điểm tối thiểu để xem kết quả
                                        </Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="scoreThreshold"
                                                type="number"
                                                min={0}
                                                max={10}
                                                step={0.5}
                                                value={scoreThreshold}
                                                onChange={(e) => setScoreThreshold(Math.max(0, Math.min(10, Number(e.target.value))))}
                                                className="w-24 text-center font-bold text-lg bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                                            />
                                            <span className="text-gray-500 dark:text-gray-400">/ 10.0 điểm</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Học sinh cần đạt ≥ {scoreThreshold.toFixed(1)} điểm để xem được kết quả chi tiết
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Security Level Card */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader>
                                <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    Mức độ bảo mật
                                </CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">
                                    Chọn mức giám sát chống gian lận cho bài thi
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { level: 0, icon: Shield, label: "Tắt bảo mật", desc: "Không giám sát", color: "gray" },
                                    { level: 1, icon: ShieldCheck, label: "Cơ bản", desc: "Chặn chuyển tab, fullscreen, copy/paste", color: "blue" },
                                    { level: 2, icon: Camera, label: "Webcam", desc: "Bật camera giám sát + chụp ảnh định kỳ", color: "amber" },
                                    { level: 3, icon: Mic, label: "Webcam + Micro", desc: "Giám sát camera + phát hiện tiếng ồn", color: "orange" },
                                    { level: 4, icon: ShieldAlert, label: "Tối đa", desc: "Camera + Micro + AI nhận diện khuôn mặt", color: "red" },
                                ].map(({ level, icon: Icon, label, desc, color }) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setSecurityLevel(level)}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                                            securityLevel === level
                                                ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20 ring-1 ring-${color}-500`
                                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg flex-shrink-0",
                                            securityLevel === level
                                                ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("font-semibold text-sm", securityLevel === level ? "text-gray-800 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                                                    Mức {level}: {label}
                                                </span>
                                                {level >= 3 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold">PRO</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                                        </div>
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors",
                                            securityLevel === level ? `bg-${color}-500 border-${color}-500` : "border-gray-300 dark:border-slate-600"
                                        )}>
                                            {securityLevel === level && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* File Uploads */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base text-gray-800 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        File đề thi (PDF)
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 dark:text-gray-400">File này sẽ hiển thị cho học sinh</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[160px]",
                                            pdfFile
                                                ? "border-green-300 bg-green-50"
                                                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                        )}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            onChange={handlePdfUpload}
                                            className="hidden"
                                        />
                                        {uploadingPdf ? (
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        ) : pdfFile ? (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div className="text-sm font-medium text-green-700">{pdfFile.name}</div>
                                                <p className="text-xs text-green-600">Click để thay đổi</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tải lên file đề thi</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Chỉ hỗ trợ PDF</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-base text-gray-800 dark:text-white flex items-center gap-2">
                                        <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        Nhập nhanh từ PDF
                                    </CardTitle>
                                    <CardDescription className="text-gray-500 dark:text-gray-400">AI tự động quét đáp án từ file</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div
                                        onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = '.pdf'
                                            input.onchange = async (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0]
                                                if (file) {
                                                    setAnswerPdfFile(file)
                                                    await parsePdfAnswers(file)
                                                }
                                            }
                                            input.click()
                                        }}
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                                            answerPdfFile
                                                ? "border-green-300 bg-green-50"
                                                : "border-purple-200 hover:border-purple-300 hover:bg-purple-50"
                                        )}
                                    >
                                        {parsingPdf ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                                <p className="text-sm text-purple-600 font-medium">Đang phân tích...</p>
                                            </>
                                        ) : parseSuccess && answerPdfFile ? (
                                            <>
                                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                                                <p className="text-sm font-medium text-green-700">Đã quét thành công!</p>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-8 h-8 text-purple-500" />
                                                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Upload bảng đáp án</p>
                                                <p className="text-xs text-purple-600 dark:text-purple-300">Hỗ trợ MC, A/B/C/D, Đúng/Sai</p>
                                            </>
                                        )}
                                    </div>

                                    {pdfFile && !answerPdfFile && (
                                        <Button
                                            variant="outline"
                                            className="w-full text-xs"
                                            onClick={() => parsePdfAnswers()}
                                            disabled={parsingPdf}
                                        >
                                            Thử quét từ file đề thi
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                size="lg"
                                onClick={() => {
                                    if (!title.trim()) {
                                        setError("Vui lòng nhập tên đề thi")
                                        return
                                    }
                                    if (mcAnswers.length === 0 && correctAnswers.length === 0) {
                                        setMcAnswers(Array(mcCount).fill(null))
                                        setCorrectAnswers(Array(mcCount).fill(null))
                                    } else if (mcAnswers.length !== mcCount) {
                                        const newMc = Array(mcCount).fill(null).map((_, i) => mcAnswers[i] || correctAnswers[i] || null)
                                        setMcAnswers(newMc)
                                        setCorrectAnswers(newMc)
                                    }

                                    if (enableTF && tfAnswers.length === 0 && tfCount > 0) {
                                        const newTf: TFAnswer[] = Array.from({ length: tfCount }, (_, i) => ({
                                            question: mcCount + 1 + i,
                                            a: true, b: true, c: true, d: true
                                        }))
                                        setTfAnswers(newTf)
                                    }

                                    if (enableSA && saAnswers.length === 0 && saCount > 0) {
                                        const effectiveTfCount = enableTF ? tfCount : 0
                                        const newSa: SAAnswer[] = Array.from({ length: saCount }, (_, i) => ({
                                            question: mcCount + effectiveTfCount + 1 + i,
                                            answer: ""
                                        }))
                                        setSaAnswers(newSa)
                                    }

                                    setError(null)
                                    setStep("answers")
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                Tiếp tục
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Step 2: Answers */
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-gray-800 dark:text-white">Nhập đáp án</CardTitle>
                                    <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                                        Tổng: {mcCount} câu hỏi
                                        {enableTF && ` • ${tfCount} Đ/S`}
                                        {enableSA && ` • ${saCount} điền đáp án`}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAnswerTab("mc")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            answerTab === "mc" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-gray-500 hover:bg-gray-100"
                                        )}
                                    >
                                        Trắc nghiệm
                                    </button>
                                    {enableTF && (
                                        <button
                                            onClick={() => setAnswerTab("tf")}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                answerTab === "tf" ? "bg-green-50 text-green-700 border border-green-200" : "text-gray-500 hover:bg-gray-100"
                                            )}
                                        >
                                            Đúng/Sai
                                        </button>
                                    )}
                                    {enableSA && (
                                        <button
                                            onClick={() => setAnswerTab("sa")}
                                            className={cn(
                                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                                answerTab === "sa" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            Điền đáp án
                                        </button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* MC Tab */}
                            {answerTab === "mc" && (
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <span className="text-blue-700 font-medium">
                                            Đã chọn: {(mcAnswers.length > 0 ? mcAnswers : correctAnswers).filter(a => a !== null).length}/{mcCount} câu
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-3">
                                        {Array.from({ length: mcCount }, (_, i) => (
                                            <div key={i} className="text-center p-2 rounded border border-gray-100 bg-gray-50/50">
                                                <p className="text-xs font-semibold text-gray-500 mb-2">Câu {i + 1}</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {OPTIONS.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerSelect(i, option)}
                                                            className={cn(
                                                                "w-full py-1.5 rounded textxs font-bold transition-all",
                                                                (mcAnswers[i] || correctAnswers[i]) === option
                                                                    ? "bg-blue-600 text-white shadow-sm"
                                                                    : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400"
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

                            {/* TF Tab */}
                            {answerTab === "tf" && (
                                <div className="space-y-3">
                                    {Array.from({ length: tfCount }, (_, i) => {
                                        const qNum = mcCount + 1 + i
                                        const answer = tfAnswers.find(a => a.question === qNum) || { question: qNum, a: true, b: true, c: true, d: true }
                                        return (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-16">Câu {qNum}</span>
                                                <div className="flex gap-6">
                                                    {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                        <div key={sub} className="flex flex-col items-center gap-2">
                                                            <span className="text-xs font-semibold text-gray-500 uppercase">{sub}</span>
                                                            <div className="flex rounded-md shadow-sm">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTf = [...tfAnswers]
                                                                        const idx = newTf.findIndex(a => a.question === qNum)
                                                                        if (idx >= 0) {
                                                                            newTf[idx] = { ...newTf[idx], [sub]: true }
                                                                        } else {
                                                                            newTf.push({ question: qNum, a: false, b: false, c: false, d: false, [sub]: true })
                                                                        }
                                                                        setTfAnswers(newTf)
                                                                    }}
                                                                    className={cn(
                                                                        "px-2.5 py-1 rounded-l-md text-xs font-bold border-y border-l transition-colors",
                                                                        answer[sub]
                                                                            ? "bg-green-600 border-green-600 text-white"
                                                                            : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                                                                    )}
                                                                >
                                                                    Đ
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTf = [...tfAnswers]
                                                                        const idx = newTf.findIndex(a => a.question === qNum)
                                                                        if (idx >= 0) {
                                                                            newTf[idx] = { ...newTf[idx], [sub]: false }
                                                                        } else {
                                                                            newTf.push({ question: qNum, a: true, b: true, c: true, d: true, [sub]: false })
                                                                        }
                                                                        setTfAnswers(newTf)
                                                                    }}
                                                                    className={cn(
                                                                        "px-2.5 py-1 rounded-r-md text-xs font-bold border transition-colors",
                                                                        !answer[sub]
                                                                            ? "bg-red-500 border-red-500 text-white"
                                                                            : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
                                                                    )}
                                                                >
                                                                    S
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

                            {/* SA Tab */}
                            {answerTab === "sa" && (
                                <div className="space-y-3">
                                    {Array.from({ length: saCount }, (_, i) => {
                                        const qNum = mcCount + tfCount + 1 + i
                                        const answer = saAnswers.find(a => a.question === qNum)
                                        return (
                                            <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="text-sm font-bold text-gray-700 w-16">Câu {qNum}</span>
                                                <Input
                                                    type="text"
                                                    value={answer?.answer?.toString() || ""}
                                                    onChange={(e) => {
                                                        const newSa = [...saAnswers]
                                                        const idx = newSa.findIndex(a => a.question === qNum)
                                                        if (idx >= 0) {
                                                            newSa[idx] = { ...newSa[idx], answer: e.target.value }
                                                        } else {
                                                            newSa.push({ question: qNum, answer: e.target.value })
                                                        }
                                                        setSaAnswers(newSa)
                                                    }}
                                                    placeholder="Nhập đáp án (số hoặc chữ)"
                                                    className="max-w-xs bg-white text-gray-900"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Notification Option */}
                            <div className="mt-8 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <input
                                    type="checkbox"
                                    id="sendNotification"
                                    checked={sendNotification}
                                    onChange={(e) => setSendNotification(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800"
                                />
                                <label htmlFor="sendNotification" className="flex-1 cursor-pointer">
                                    <div className="font-medium text-blue-900 dark:text-blue-300">Gửi thông báo cho học sinh</div>
                                    <div className="text-xs text-blue-700 dark:text-blue-400">Học sinh sẽ nhận được thông báo ngay khi đề thi được Publish</div>
                                </label>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep("info")}
                                    className="text-gray-500 hover:text-gray-900"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại
                                </Button>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSave(false)}
                                        disabled={loading}
                                    >
                                        Lưu nháp
                                    </Button>
                                    <Button
                                        onClick={() => handleSave(true)}
                                        disabled={loading}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                        Publish ngay
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Exam Link Dialog */}
            {createdExamId && (
                <ExamLinkDialog
                    examId={createdExamId}
                    examTitle={title}
                    open={showLinkDialog}
                    onClose={() => {
                        setShowLinkDialog(false)
                        router.push("/teacher/dashboard")
                    }}
                />
            )}
        </div >
    )
}
