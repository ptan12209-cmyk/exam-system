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
    Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]

export default function CreateExamPage() {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(15)
    const [maxAttempts, setMaxAttempts] = useState(1)  // 1 = no retake, 0 = unlimited

    // Scheduling
    const [isScheduled, setIsScheduled] = useState(false)
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")

    // Question type toggles
    const [enableTF, setEnableTF] = useState(false)  // True/False
    const [enableSA, setEnableSA] = useState(false)  // Short answer

    // Question counts per type
    const [mcCount, setMcCount] = useState(12)  // Multiple choice
    const [tfCount, setTfCount] = useState(4)   // True/False
    const [saCount, setSaCount] = useState(6)   // Short answer

    // Legacy - for backwards compatibility
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
    const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null)  // Separate answer PDF
    const [loading, setLoading] = useState(false)
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const [parsingPdf, setParsingPdf] = useState(false)
    const [parseSuccess, setParseSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<"info" | "answers">("info")
    const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc")

    // Worker API URL (change to Render URL after deployment)
    const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000"

    // Generate answer slots when total questions changes
    const handleTotalQuestionsChange = (value: number) => {
        const newValue = Math.max(1, Math.min(100, value))
        setTotalQuestions(newValue)

        // Resize answers array
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

            // Sanitize file name - remove Vietnamese diacritics and special chars
            const sanitizeFileName = (name: string) => {
                return name
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
                    .replace(/[đĐ]/g, "d")
                    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special chars with underscore
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

    // Auto-parse PDF to extract answer key
    const parsePdfAnswers = async (fileToUse?: File) => {
        // Priority: passed file > answerPdfFile > pdfFile
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

            // === MULTIPLE CHOICE ===
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
                // Also set legacy for backwards compatibility
                setCorrectAnswers(parsedMc)
                setTotalQuestions(parsedMc.length)
            }

            // === TRUE/FALSE ===
            const tfData = data.true_false || []
            if (tfData.length > 0) {
                const parsedTf: TFAnswer[] = tfData.map((tf: { question: number; answers: { a: boolean; b: boolean; c: boolean; d: boolean } }) => ({
                    question: tf.question,
                    a: tf.answers.a,
                    b: tf.answers.b,
                    c: tf.answers.c,
                    d: tf.answers.d
                }))
                setTfAnswers(parsedTf)
                setTfCount(parsedTf.length)
                setEnableTF(true)  // Auto-enable TF when detected
            }

            // === SHORT ANSWER ===
            const saData = data.short_answer || []
            if (saData.length > 0) {
                const parsedSa: SAAnswer[] = saData.map((sa: { question: number; answer: number | string }) => ({
                    question: sa.question,
                    answer: sa.answer
                }))
                setSaAnswers(parsedSa)
                setSaCount(parsedSa.length)
                setEnableSA(true)  // Auto-enable SA when detected
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
    }

    const handleSave = async (publish: boolean = false) => {
        if (!title.trim()) {
            setError("Vui lòng nhập tên đề thi")
            return
        }

        // Check if at least MC answers are filled
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

            // Prepare mc_answers as array of objects
            const mcAnswerObjects = (mcAnswers.length > 0 ? mcAnswers : correctAnswers).map((ans, i) => ({
                question: i + 1,
                answer: ans
            })).filter(a => a.answer !== null)

            // Only include TF if enabled
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

            // Only include SA if enabled
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

            console.log("Saving exam with:", { mcAnswerObjects, finalTfAnswers, finalSaAnswers, enableTF, enableSA })

            const { data, error: insertError } = await supabase
                .from("exams")
                .insert({
                    teacher_id: user.id,
                    title: title.trim(),
                    duration,
                    total_questions: mcCount + effectiveTfCount + effectiveSaCount,
                    correct_answers: mcAnswers.length > 0 ? mcAnswers : correctAnswers, // Legacy
                    mc_answers: mcAnswerObjects,
                    tf_answers: finalTfAnswers,
                    sa_answers: finalSaAnswers,
                    pdf_url: pdfUrl,
                    max_attempts: maxAttempts,
                    status: publish ? "published" : "draft",
                    // Scheduling fields
                    is_scheduled: isScheduled,
                    start_time: isScheduled && startTime ? new Date(startTime).toISOString() : null,
                    end_time: isScheduled && endTime ? new Date(endTime).toISOString() : null
                })
                .select()
                .single()

            if (insertError) throw insertError

            router.push("/teacher/dashboard")
        } catch (err) {
            setError("Lỗi lưu đề thi: " + (err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Tạo đề thi mới</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            {step === "info" ? "Bước 1: Thông tin đề thi" : "Bước 2: Nhập đáp án đúng"}
                        </p>
                    </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        step === "info"
                            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                            : "bg-slate-700/30 text-slate-400"
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            step === "info" ? "bg-blue-500 text-white" : "bg-slate-600"
                        )}>
                            {step === "answers" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
                        </div>
                        Thông tin
                    </div>
                    <div className="h-px flex-1 bg-slate-700" />
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg",
                        step === "answers"
                            ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                            : "bg-slate-700/30 text-slate-400"
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            step === "answers" ? "bg-blue-500 text-white" : "bg-slate-600"
                        )}>
                            2
                        </div>
                        Đáp án
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-6 flex items-center gap-3">
                        <X className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {step === "info" ? (
                    /* Step 1: Basic Info */
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Thông tin đề thi</CardTitle>
                            <CardDescription className="text-slate-400">
                                Nhập thông tin cơ bản và upload file PDF đề thi (nếu có)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-slate-300">Tên đề thi *</Label>
                                <Input
                                    id="title"
                                    placeholder="Ví dụ: Kiểm tra 15 phút Toán - Chương 1"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration" className="text-slate-300">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Thời gian (phút)
                                    </Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min={1}
                                        max={180}
                                        value={duration}
                                        onChange={(e) => setDuration(Number(e.target.value))}
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="totalQuestions" className="text-slate-300">
                                        Số câu trắc nghiệm
                                    </Label>
                                    <Input
                                        id="totalQuestions"
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={totalQuestions}
                                        onChange={(e) => handleTotalQuestionsChange(Number(e.target.value))}
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                    />
                                </div>
                            </div>

                            {/* Max Attempts */}
                            <div className="space-y-2">
                                <Label htmlFor="maxAttempts" className="text-slate-300">
                                    Số lần làm bài tối đa
                                </Label>
                                <select
                                    id="maxAttempts"
                                    value={maxAttempts}
                                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                                    className="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white"
                                >
                                    <option value={1}>1 lần (không cho làm lại)</option>
                                    <option value={2}>2 lần</option>
                                    <option value={3}>3 lần</option>
                                    <option value={5}>5 lần</option>
                                    <option value={10}>10 lần</option>
                                    <option value={0}>Không giới hạn</option>
                                </select>
                                <p className="text-xs text-slate-500">
                                    {maxAttempts === 0
                                        ? "Học sinh có thể làm lại bài không giới hạn"
                                        : maxAttempts === 1
                                            ? "Học sinh chỉ được làm 1 lần duy nhất"
                                            : `Học sinh có thể làm tối đa ${maxAttempts} lần, điểm cao nhất sẽ được tính`
                                    }
                                </p>
                            </div>

                            {/* Scheduling Toggle */}
                            <div className="space-y-3">
                                <div
                                    onClick={() => setIsScheduled(!isScheduled)}
                                    className={cn(
                                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                        isScheduled
                                            ? "border-orange-500 bg-orange-500/10"
                                            : "border-slate-600 hover:border-slate-500"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-white">📅 Giới hạn thời gian mở đề</span>
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                                            isScheduled ? "border-orange-500 bg-orange-500" : "border-slate-500"
                                        )}>
                                            {isScheduled && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        Học sinh chỉ có thể làm bài trong khoảng thời gian đã định
                                    </p>
                                </div>

                                {isScheduled && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">🕐 Thời gian bắt đầu</Label>
                                            <Input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="bg-slate-700/50 border-slate-600 text-white"
                                            />
                                            <p className="text-xs text-slate-500">
                                                Trước thời gian này, đề sẽ không hiển thị
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">🔒 Thời gian kết thúc</Label>
                                            <Input
                                                type="datetime-local"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="bg-slate-700/50 border-slate-600 text-white"
                                            />
                                            <p className="text-xs text-slate-500">
                                                Sau thời gian này, không cho làm bài mới
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Question Type Toggles */}
                            <div className="space-y-3">
                                <Label className="text-slate-300">Loại câu hỏi</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* TF Toggle */}
                                    <div
                                        onClick={() => setEnableTF(!enableTF)}
                                        className={cn(
                                            "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                            enableTF
                                                ? "border-green-500 bg-green-500/10"
                                                : "border-slate-600 hover:border-slate-500"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-white">Câu hỏi Đúng/Sai</span>
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                enableTF ? "border-green-500 bg-green-500" : "border-slate-500"
                                            )}>
                                                {enableTF && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">Dạng 4 ý a, b, c, d - chọn Đúng/Sai</p>
                                        {enableTF && (
                                            <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-xs text-slate-400">Số câu:</span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={tfCount}
                                                    onChange={(e) => setTfCount(Math.max(1, Number(e.target.value)))}
                                                    className="bg-slate-700 border-slate-600 text-white w-20 h-8 text-center"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* SA Toggle */}
                                    <div
                                        onClick={() => setEnableSA(!enableSA)}
                                        className={cn(
                                            "p-4 rounded-lg border-2 cursor-pointer transition-all",
                                            enableSA
                                                ? "border-purple-500 bg-purple-500/10"
                                                : "border-slate-600 hover:border-slate-500"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-white">Câu hỏi Trả lời ngắn</span>
                                            <div className={cn(
                                                "w-5 h-5 rounded border-2 flex items-center justify-center",
                                                enableSA ? "border-purple-500 bg-purple-500" : "border-slate-500"
                                            )}>
                                                {enableSA && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">Đáp án là số hoặc text ngắn</p>
                                        {enableSA && (
                                            <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <span className="text-xs text-slate-400">Số câu:</span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={saCount}
                                                    onChange={(e) => setSaCount(Math.max(1, Number(e.target.value)))}
                                                    className="bg-slate-700 border-slate-600 text-white w-20 h-8 text-center"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 1: File đề thi (cho học sinh) */}
                            <div className="space-y-2 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                                <Label className="text-blue-300 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    📋 File đề thi (cho học sinh xem)
                                </Label>
                                <p className="text-xs text-slate-400 mb-2">
                                    File PDF chỉ chứa câu hỏi, KHÔNG chứa đáp án
                                </p>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                                        pdfFile
                                            ? "border-green-500/50 bg-green-500/5"
                                            : "border-slate-600 hover:border-slate-500"
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
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-400" />
                                    ) : pdfFile ? (
                                        <>
                                            <FileText className="w-8 h-8 mx-auto text-green-400 mb-2" />
                                            <p className="text-sm text-green-400">{pdfFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">Click để thay đổi</p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                            <p className="text-sm text-slate-400">Click để upload PDF đề thi</p>
                                            <p className="text-xs text-slate-500 mt-1">Học sinh sẽ xem file này khi làm bài</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: File đáp án + AI Scan */}
                            <div className="space-y-3 p-4 bg-gradient-to-r from-purple-900/20 to-green-900/20 rounded-lg border border-purple-500/30">
                                <Label className="text-purple-300 flex items-center gap-2">
                                    <Wand2 className="w-4 h-4" />
                                    📝 File đáp án (quét bằng AI)
                                </Label>
                                <p className="text-xs text-slate-400 mb-2">
                                    Upload PDF chỉ chứa bảng đáp án để AI quét tự động. File này sẽ KHÔNG hiển thị cho học sinh.
                                </p>

                                {/* Answer PDF Upload */}
                                <div
                                    onClick={() => {
                                        const input = document.createElement('input')
                                        input.type = 'file'
                                        input.accept = '.pdf'
                                        input.onchange = async (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0]
                                            if (file) {
                                                setAnswerPdfFile(file)
                                                // Immediately parse the answer PDF
                                                await parsePdfAnswers(file)
                                            }
                                        }
                                        input.click()
                                    }}
                                    className={cn(
                                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                                        answerPdfFile
                                            ? "border-green-500/50 bg-green-500/10"
                                            : "border-purple-500/50 hover:bg-purple-500/10"
                                    )}
                                >
                                    {parsingPdf ? (
                                        <>
                                            <Loader2 className="w-6 h-6 mx-auto text-purple-400 mb-2 animate-spin" />
                                            <p className="text-sm text-purple-300">Đang quét AI...</p>
                                        </>
                                    ) : parseSuccess && answerPdfFile ? (
                                        <>
                                            <CheckCircle2 className="w-6 h-6 mx-auto text-green-400 mb-2" />
                                            <p className="text-sm text-green-400">✓ {answerPdfFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">Click để thay đổi file</p>
                                        </>
                                    ) : answerPdfFile ? (
                                        <>
                                            <FileText className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                                            <p className="text-sm text-blue-300">{answerPdfFile.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">Click để thay đổi</p>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-6 h-6 mx-auto text-purple-400 mb-2" />
                                            <p className="text-sm text-purple-300">Click để upload PDF đáp án</p>
                                            <p className="text-xs text-slate-500 mt-1">AI sẽ tự động trích xuất đáp án</p>
                                        </>
                                    )}
                                </div>

                                {/* AI Parse Button - only show if exam PDF has answers embedded */}
                                {pdfFile && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => parsePdfAnswers()}
                                        disabled={parsingPdf}
                                        className={cn(
                                            "w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10",
                                            parseSuccess && "border-green-500/50 text-green-400"
                                        )}
                                    >
                                        {parsingPdf ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                🤖 AI đang phân tích...
                                            </>
                                        ) : parseSuccess ? (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                ✅ Đã quét xong! Click để quét lại
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4 mr-2" />
                                                🤖 Quét từ PDF đề thi (nếu có đáp án ở cuối)
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => {
                                        if (!title.trim()) {
                                            setError("Vui lòng nhập tên đề thi")
                                            return
                                        }
                                        // Initialize MC answers if needed
                                        if (mcAnswers.length === 0 && correctAnswers.length === 0) {
                                            setMcAnswers(Array(mcCount).fill(null))
                                            setCorrectAnswers(Array(mcCount).fill(null))
                                        } else if (mcAnswers.length !== mcCount) {
                                            const newMc = Array(mcCount).fill(null).map((_, i) => mcAnswers[i] || correctAnswers[i] || null)
                                            setMcAnswers(newMc)
                                            setCorrectAnswers(newMc)
                                        }

                                        // Initialize TF answers if needed and enabled
                                        if (enableTF && tfAnswers.length === 0 && tfCount > 0) {
                                            const newTf: TFAnswer[] = Array.from({ length: tfCount }, (_, i) => ({
                                                question: mcCount + 1 + i,
                                                a: true, b: true, c: true, d: true // Default all true
                                            }))
                                            setTfAnswers(newTf)
                                        }

                                        // Initialize SA answers if needed and enabled
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
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                >
                                    Tiếp theo: Nhập đáp án
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Step 2: Answer Input */
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Nhập đáp án đúng</CardTitle>
                            <CardDescription className="text-slate-400">
                                Tổng: {mcCount} trắc nghiệm
                                {enableTF && ` + ${tfCount} đúng/sai`}
                                {enableSA && ` + ${saCount} trả lời ngắn`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Tabs */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setAnswerTab("mc")}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                        answerTab === "mc"
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                    )}
                                >
                                    Trắc nghiệm ABCD ({mcCount})
                                </button>
                                {enableTF && (
                                    <button
                                        onClick={() => setAnswerTab("tf")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            answerTab === "tf"
                                                ? "bg-green-600 text-white"
                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        Đúng/Sai ({tfCount})
                                    </button>
                                )}
                                {enableSA && (
                                    <button
                                        onClick={() => setAnswerTab("sa")}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                            answerTab === "sa"
                                                ? "bg-purple-600 text-white"
                                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                        )}
                                    >
                                        Trả lời ngắn ({saCount})
                                    </button>
                                )}
                            </div>

                            {/* MC Tab */}
                            {answerTab === "mc" && (
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-4">
                                        <span className="text-slate-400">
                                            Đã chọn: {(mcAnswers.length > 0 ? mcAnswers : correctAnswers).filter(a => a !== null).length}/{mcCount}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-4 mb-8">
                                        {Array.from({ length: mcCount }, (_, i) => (
                                            <div key={i} className="text-center">
                                                <p className="text-xs text-slate-400 mb-2">Câu {i + 1}</p>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {OPTIONS.map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerSelect(i, option)}
                                                            className={cn(
                                                                "w-full py-1.5 rounded text-xs font-medium transition-colors",
                                                                (mcAnswers[i] || correctAnswers[i]) === option
                                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
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
                                <div className="space-y-4">
                                    {Array.from({ length: tfCount }, (_, i) => {
                                        const qNum = mcCount + 1 + i
                                        const answer = tfAnswers.find(a => a.question === qNum) || { question: qNum, a: true, b: true, c: true, d: true }
                                        return (
                                            <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                                                <span className="text-sm font-medium text-slate-300 w-20">Câu {qNum}</span>
                                                <div className="flex gap-4">
                                                    {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                        <div key={sub} className="flex flex-col items-center gap-1">
                                                            <span className="text-xs text-slate-500">{sub})</span>
                                                            <div className="flex gap-1">
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
                                                                        "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                                                        answer[sub]
                                                                            ? "bg-green-600 text-white"
                                                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
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
                                                                        "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                                                                        !answer[sub]
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
                                            <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                                                <span className="text-sm font-medium text-slate-300 w-20">Câu {qNum}</span>
                                                <input
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
                                                    placeholder="Nhập đáp án (số)"
                                                    className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep("info")}
                                    className="text-slate-400"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Quay lại
                                </Button>

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSave(false)}
                                        disabled={loading}
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Lưu nháp
                                    </Button>
                                    <Button
                                        onClick={() => handleSave(true)}
                                        disabled={loading}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Eye className="w-4 h-4 mr-2" />
                                        )}
                                        Publish đề thi
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
