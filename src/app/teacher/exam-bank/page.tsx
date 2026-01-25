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
    ArrowLeft,
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
    Search
} from "lucide-react"
import { cn } from "@/lib/utils"

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-white bg-white shadow-sm border border-gray-200">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-600" />
                                Ngân hàng Đề thi
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Lưu trữ và quản lý đề thi của bạn</p>
                        </div>
                    </div>
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
                </div>

                {/* Filters (Optional Placeholder) */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm đề thi..."
                        className="pl-9 bg-white border-gray-200 text-gray-900 w-full md:w-96"
                    />
                </div>

                {/* Exams Grid */}
                {exams.length === 0 ? (
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-blue-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có đề thi nào</h2>
                            <p className="text-gray-500 mb-6">Create your first exam by uploading a PDF and answer key.</p>
                            <Button
                                onClick={() => setShowCreate(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm đề thi đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => (
                            <Card key={exam.id} className="border-gray-200 shadow-sm bg-white hover:shadow-md transition-all group">
                                <CardHeader className="pb-3 border-b border-gray-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <CardTitle className="text-lg font-bold text-gray-800 line-clamp-1" title={exam.title}>
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
                                    <div className="space-y-2 text-sm text-gray-600">
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
                                            className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                                        >
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(exam.id)}
                                            className="border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto">
                    <Card className="w-full max-w-2xl border-gray-200 bg-white shadow-xl my-8">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4">
                            <CardTitle className="text-gray-800 text-xl">
                                {editingId ? "Cập nhật đề thi" : "Thêm đề thi mới"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowCreate(false)
                                    resetForm()
                                }}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 -mr-2"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-medium">Tên đề thi <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="VD: Đề thi HK1 Vật Lý 12"
                                            className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-700 font-medium">Môn học</Label>
                                        <select
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                        >
                                            {SUBJECTS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Mô tả</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Mô tả chi tiết về đề thi..."
                                        className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        rows={2}
                                    />
                                </div>

                                {/* Upload Section */}
                                <div className="grid grid-cols-1 gap-6">
                                    {/* Exam File */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                        <Label className="text-blue-800 font-semibold flex items-center gap-2 mb-2">
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
                                                className="bg-white border-blue-200 text-gray-700 file:bg-blue-100 file:text-blue-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs hover:file:bg-blue-200"
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
                                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                        <Label className="text-purple-800 font-semibold flex items-center gap-2 mb-2">
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
                                                className="bg-white border-purple-200 text-gray-700 file:bg-purple-100 file:text-purple-700 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs hover:file:bg-purple-200"
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
                                            <div className="text-sm space-y-1 mb-3 p-2 bg-white rounded border border-purple-100">
                                                <p className="text-green-600 font-medium">
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
                                                <Label className="text-gray-700 font-medium text-xs">Chuỗi đáp án</Label>
                                                <span className="text-xs text-gray-500">Định dạng: 1A,2B,3C...</span>
                                            </div>
                                            <Textarea
                                                value={answerKey}
                                                onChange={(e) => setAnswerKey(e.target.value)}
                                                placeholder="1A,2B,3C,4D..."
                                                className="bg-white border-gray-300 font-mono text-sm"
                                                rows={3}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Tổng số câu hỏi</Label>
                                    <Input
                                        type="number"
                                        value={totalQuestions}
                                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                                        min={1}
                                        max={200}
                                        className="bg-white border-gray-300 w-32"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreate(false)
                                            resetForm()
                                        }}
                                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
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
            )}

            {/* PDF Preview Modal */}
            {previewExam && previewExam.pdf_url && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-gray-900 font-semibold text-lg">{previewExam.title}</h3>
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
            )}
        </div>
    )
}
