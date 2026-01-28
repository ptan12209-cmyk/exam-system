"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    FileText,
    Upload,
    Trash2,
    Loader2,
    Eye,
    Calendar,
    HelpCircle,
    X,
    CheckCircle,
    AlertTriangle,
    Sparkles,
    Wand2,
    GraduationCap
} from "lucide-react"
import { FilterBar, EmptyState } from "@/components/shared"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"

interface ExamInBank {
    id: string
    title: string
    subject: string
    description: string | null
    pdf_url: string | null
    answer_key: string | null // JSON string of answers
    total_questions: number
    created_at: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions?: any[] // Parsed from AI or manual input
}

const SUBJECTS = [
    { value: "math", label: "Toán" },
    { value: "physics", label: "Vật Lý" },
    { value: "chemistry", label: "Hóa Học" },
    { value: "english", label: "Tiếng Anh" },
    { value: "biology", label: "Sinh Học" },
    { value: "history", label: "Lịch Sử" },
    { value: "geography", label: "Địa Lý" },
    { value: "et", label: "Giáo dục kinh tế & pháp luật" },
]

// Python worker URL for AI extraction
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000"

export default function ExamBankPage() {
    const router = useRouter()
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const answerPdfRef = useRef<HTMLInputElement>(null)
    const [fullName, setFullName] = useState("")

    const [exams, setExams] = useState<ExamInBank[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [saving, setSaving] = useState(false)
    const [uploadingPdf, setUploadingPdf] = useState(false)

    // AI Scan state
    const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null)
    const [scanning, setScanning] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [scanResult, setScanResult] = useState<any>(null)

    // Form state
    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("physics")
    const [description, setDescription] = useState("")
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfUrl, setPdfUrl] = useState("")
    const [answerKey, setAnswerKey] = useState("") // Format: 1A,2B,3C,...
    const [totalQuestions, setTotalQuestions] = useState(30)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Preview
    const [previewExam, setPreviewExam] = useState<ExamInBank | null>(null)

    useEffect(() => {
        fetchExams()
    }, [])

    const fetchExams = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/login")
            return
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

        if (profile) setFullName(profile.full_name || "")

        // Use existing exams table
        const { data: examsData } = await supabase
            .from("exams")
            .select("*")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false })

        if (examsData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setExams(examsData.map((e: any) => ({
                id: e.id,
                title: e.title,
                subject: e.subject || "physics",
                description: e.description,
                pdf_url: e.pdf_url,
                answer_key: e.answer_key,
                total_questions: e.total_questions || 0,
                created_at: e.created_at,
                questions: e.questions
            })))
        }

        setLoading(false)
    }

    const resetForm = () => {
        setTitle("")
        setSubject("physics")
        setDescription("")
        setPdfFile(null)
        setPdfUrl("")
        setAnswerKey("")
        setTotalQuestions(30)
        setEditingId(null)
        setAnswerPdfFile(null)
        setScanResult(null)
    }

    // AI Scan answer key from PDF
    const handleAIScan = async () => {
        if (!answerPdfFile) {
            alert("Vui lòng chọn file PDF đáp án")
            return
        }

        setScanning(true)
        setScanResult(null)

        try {
            const formData = new FormData()
            formData.append("file", answerPdfFile)

            const response = await fetch(`${WORKER_URL}/extract-answers`, {
                method: "POST",
                body: formData
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const data = await response.json()
            console.log("AI Scan result:", data)
            setScanResult(data)

            // Convert to answer key format: 1A,2B,3C,...
            if (data.multiple_choice && data.multiple_choice.length > 0) {
                const answerStr = data.multiple_choice
                    .map((ans: string, idx: number) => `${idx + 1}${ans}`)
                    .join(",")
                setAnswerKey(answerStr)
                setTotalQuestions(data.multiple_choice.length)
            }
        } catch (err) {
            console.error("AI Scan error:", err)
            alert("Lỗi quét AI: " + (err as Error).message + "\n\nĐảm bảo Python worker đang chạy!")
        } finally {
            setScanning(false)
        }
    }

    const handleEdit = (exam: ExamInBank) => {
        setEditingId(exam.id)
        setTitle(exam.title)
        setSubject(exam.subject)
        setDescription(exam.description || "")
        setPdfUrl(exam.pdf_url || "")
        setAnswerKey(exam.answer_key || "")
        setTotalQuestions(exam.total_questions)
        setShowCreate(true)
    }

    const handlePdfUpload = async () => {
        if (!pdfFile) return

        setUploadingPdf(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const fileName = `${user.id}/${Date.now()}_${pdfFile.name}`
            const { error } = await supabase.storage
                .from("exams")
                .upload(fileName, pdfFile)

            if (error) throw error

            const { data: urlData } = supabase.storage
                .from("exams")
                .getPublicUrl(fileName)

            setPdfUrl(urlData.publicUrl)
        } catch (err) {
            alert("Lỗi upload PDF: " + (err as Error).message)
        } finally {
            setUploadingPdf(false)
        }
    }

    const parseAnswerKey = (input: string): Record<number, string> => {
        // Parse format: 1A,2B,3C,4D or 1.A,2.B or 1-A,2-B
        const result: Record<number, string> = {}
        const parts = input.split(/[,;\s]+/).filter(Boolean)

        for (const part of parts) {
            const match = part.match(/(\d+)[.\-]?([A-Da-d])/)
            if (match) {
                result[parseInt(match[1])] = match[2].toUpperCase()
            }
        }
        return result
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title) {
            alert("Vui lòng nhập tên đề thi")
            return
        }

        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            // Parse answer key to create questions array
            const parsedAnswers = parseAnswerKey(answerKey)
            const questions = Object.entries(parsedAnswers).map(([num, ans]) => ({
                question: `Câu ${num}`,
                options: ["A", "B", "C", "D"],
                answer: ans
            }))

            const data = {
                title,
                subject,
                description: description || null,
                pdf_url: pdfUrl || null,
                answer_key: answerKey || null,
                total_questions: totalQuestions,
                questions: questions.length > 0 ? questions : null,
                status: "published",
                created_by: user.id
            }

            if (editingId) {
                const { error } = await supabase
                    .from("exams")
                    .update(data)
                    .eq("id", editingId)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("exams")
                    .insert(data)

                if (error) throw error
            }

            await fetchExams()
            setShowCreate(false)
            resetForm()
        } catch (err) {
            alert("Lỗi: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa đề thi này?")) return

        const { error } = await supabase
            .from("exams")
            .delete()
            .eq("id", id)

        if (error) {
            alert("Lỗi xóa: " + error.message)
            return
        }

        await fetchExams()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
            {/* Sidebar */}
            <TeacherSidebar onLogout={handleLogout} />

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            Ngân hàng Đề thi
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Lưu trữ và quản lý đề thi của bạn</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => {
                                resetForm()
                                setShowCreate(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm đề thi
                        </Button>
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>

                {/* Add button for mobile */}
                <div className="lg:hidden mb-4">
                    <Button
                        onClick={() => {
                            resetForm()
                            setShowCreate(true)
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm đề thi
                    </Button>
                </div>

                {/* Filters */}
                <FilterBar
                    searchPlaceholder="Tìm kiếm đề thi..."
                    showFilter={false}
                    className="mb-6"
                />

                {/* Exams Grid */}
                {exams.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Chưa có đề thi nào"
                        description="Tạo đề thi đầu tiên bằng cách upload PDF và đáp án"
                        actionLabel="Thêm đề thi đầu tiên"
                        onAction={() => setShowCreate(true)}
                        iconColor="text-blue-500"
                        iconBgColor="bg-blue-50 dark:bg-blue-900/30"
                    />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => (
                            <Card key={exam.id} className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800 hover:shadow-md transition-all group">
                                <CardHeader className="pb-3 border-b border-gray-50 dark:border-slate-700">
                                    <div className="flex items-start justify-between mb-2">
                                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white line-clamp-1" title={exam.title}>
                                            {exam.title}
                                        </CardTitle>
                                        {exam.pdf_url ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                PDF
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                No PDF
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                                        {SUBJECTS.find(s => s.value === exam.subject)?.label || exam.subject}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-gray-400" />
                                            <span>{exam.total_questions} câu hỏi</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{new Date(exam.created_at).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-gray-50">
                                        {exam.pdf_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPreviewExam(exam)}
                                                className="flex-1 border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Xem
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(exam)}
                                            className="flex-1 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                        >
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(exam.id)}
                                            className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
                        <Card className="w-full max-w-2xl border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl my-8">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                                <CardTitle className="text-gray-800 dark:text-white text-xl">
                                    {editingId ? "Cập nhật đề thi" : "Thêm đề thi mới"}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowCreate(false)
                                        resetForm()
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 -mr-2"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-gray-700 dark:text-gray-300 font-medium">Tên đề thi <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="VD: Đề thi HK1 Vật Lý 12"
                                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-700 dark:text-gray-300 font-medium">Môn học</Label>
                                            <select
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                            >
                                                {SUBJECTS.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-gray-700 dark:text-gray-300 font-medium">Mô tả</Label>
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Mô tả chi tiết về đề thi..."
                                            className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 dark:text-white"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Upload Section */}
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Exam File */}
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                            <Label className="text-blue-800 dark:text-blue-400 font-semibold flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4" />
                                                File đề thi (PDF)
                                            </Label>
                                            <p className="text-xs text-blue-600 mb-3">
                                                File này sẽ được hiển thị cho học sinh khi làm bài.
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="file"
                                                    accept=".pdf"
                                                    ref={fileInputRef}
                                                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                                    className="bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 file:bg-blue-100 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs hover:file:bg-blue-200 dark:hover:file:bg-blue-900/50"
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={handlePdfUpload}
                                                    disabled={!pdfFile || uploadingPdf}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[40px]"
                                                >
                                                    {uploadingPdf ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                            {pdfUrl && (
                                                <p className="text-sm text-green-600 mt-2 flex items-center">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Đã tải lên thành công: {pdfUrl.split('/').pop()}
                                                </p>
                                            )}
                                        </div>

                                        {/* Answer Key & AI Scan */}
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                            <Label className="text-purple-800 dark:text-purple-400 font-semibold flex items-center gap-2 mb-2">
                                                <Wand2 className="w-4 h-4" />
                                                File đáp án & Quét AI
                                            </Label>
                                            <p className="text-xs text-purple-600 mb-3">
                                                Tải lên PDF đáp án để AI tự động trích xuất hoặc nhập tay bên dưới.
                                            </p>
                                            <div className="flex gap-2 mb-3">
                                                <Input
                                                    type="file"
                                                    accept=".pdf"
                                                    ref={answerPdfRef}
                                                    onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)}
                                                    className="bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800 text-gray-700 dark:text-gray-300 file:bg-purple-100 dark:file:bg-purple-900/30 file:text-purple-700 dark:file:text-purple-400 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs hover:file:bg-purple-200 dark:hover:file:bg-purple-900/50"
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={handleAIScan}
                                                    disabled={!answerPdfFile || scanning}
                                                    className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                                                >
                                                    {scanning ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Đang quét...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-4 h-4 mr-2" />
                                                            Quét AI
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            {scanResult && (
                                                <div className="text-sm space-y-1 mb-3 p-2 bg-white dark:bg-slate-800 rounded border border-purple-100 dark:border-purple-900">
                                                    <p className="text-green-600 dark:text-green-400 font-medium">
                                                        ✓ Tìm thấy: {scanResult.multiple_choice?.length || 0} câu trắc nghiệm
                                                    </p>
                                                    {scanResult.true_false?.length > 0 && (
                                                        <p className="text-blue-600 font-medium">
                                                            + {scanResult.true_false.length} câu đúng/sai
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <Label className="text-gray-700 dark:text-gray-300 font-medium text-xs">Chuỗi đáp án</Label>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Định dạng: 1A,2B,3C...</span>
                                                </div>
                                                <Textarea
                                                    value={answerKey}
                                                    onChange={(e) => setAnswerKey(e.target.value)}
                                                    placeholder="1A,2B,3C,4D..."
                                                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 font-mono text-sm text-gray-900 dark:text-white"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-gray-700 dark:text-gray-300 font-medium">Tổng số câu hỏi</Label>
                                            <Input
                                                type="number"
                                                value={totalQuestions}
                                                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                                                min={1}
                                                max={200}
                                                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white w-32"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowCreate(false)
                                                resetForm()
                                            }}
                                            className="flex-1 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : editingId ? (
                                                "Cập nhật"
                                            ) : (
                                                "Lưu đề thi"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )
                }

                {/* PDF Preview Modal */}
                {
                    previewExam && previewExam.pdf_url && (
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 rounded-lg overflow-hidden flex flex-col shadow-2xl">
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg">{previewExam.title}</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setPreviewExam(null)}
                                        className="text-gray-500 hover:bg-gray-200 rounded-full"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                                <iframe
                                    src={previewExam.pdf_url}
                                    className="w-full flex-1 bg-gray-100"
                                    title="PDF Preview"
                                />
                            </div>
                        </div>
                    )
                }
            </main>

            {/* Mobile Bottom Nav */}
            <TeacherBottomNav />
        </div>
    )
}
