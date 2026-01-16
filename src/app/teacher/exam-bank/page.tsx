"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Wand2
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
    questions?: any[] // Parsed from AI or manual input
}

const SUBJECTS = [
    { value: "physics", label: "Vật Lý" },
    { value: "chemistry", label: "Hóa Học" },
    { value: "math", label: "Toán" },
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
            const { data, error } = await supabase.storage
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-400" />
                            <h1 className="text-xl font-bold text-white">Ngân hàng Đề thi</h1>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm()
                            setShowCreate(true)
                        }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm đề thi
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Exams Grid */}
                {exams.length === 0 ? (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-12 text-center">
                            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-white mb-2">Chưa có đề thi nào</h2>
                            <p className="text-slate-400 mb-6">Upload đề thi PDF và đáp án để bắt đầu</p>
                            <Button
                                onClick={() => setShowCreate(true)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm đề thi đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => (
                            <Card key={exam.id} className="border-slate-700 bg-slate-800/50 hover:border-blue-500/50 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg text-white">{exam.title}</CardTitle>
                                        {exam.pdf_url ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                                Có PDF
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                                Chưa có PDF
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {SUBJECTS.find(s => s.value === exam.subject)?.label || exam.subject}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <HelpCircle className="w-4 h-4" />
                                            {exam.total_questions} câu
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-700">
                                        {exam.pdf_url && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPreviewExam(exam)}
                                                className="flex-1 text-blue-400 hover:text-blue-300"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Xem PDF
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(exam)}
                                            className="flex-1 text-slate-400 hover:text-white"
                                        >
                                            Sửa
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(exam.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <Card className="w-full max-w-lg border-slate-700 bg-slate-800 my-8">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">
                                {editingId ? "Sửa đề thi" : "Thêm đề thi mới"}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setShowCreate(false)
                                    resetForm()
                                }}
                                className="text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Tên đề thi *</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="VD: Đề thi HK1 Vật Lý 12 - 2024"
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Môn học</Label>
                                        <select
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
                                        >
                                            {SUBJECTS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Số câu hỏi</Label>
                                        <Input
                                            type="number"
                                            value={totalQuestions}
                                            onChange={(e) => setTotalQuestions(Number(e.target.value))}
                                            min={1}
                                            max={100}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">Mô tả</Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Mô tả về đề thi..."
                                        className="bg-slate-700/50 border-slate-600 text-white"
                                        rows={2}
                                    />
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
                                    <div className="flex gap-2">
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            ref={fileInputRef}
                                            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handlePdfUpload}
                                            disabled={!pdfFile || uploadingPdf}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {uploadingPdf ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {pdfUrl && (
                                        <p className="text-sm text-green-400">
                                            ✓ Đã upload: {pdfUrl.split('/').pop()}
                                        </p>
                                    )}
                                </div>

                                {/* SECTION 2: File đáp án + AI Scan */}
                                <div className="space-y-3 p-4 bg-gradient-to-r from-purple-900/20 to-green-900/20 rounded-lg border border-purple-500/30">
                                    <Label className="text-purple-300 flex items-center gap-2">
                                        <Wand2 className="w-4 h-4" />
                                        📝 File đáp án (quét bằng AI)
                                    </Label>
                                    <p className="text-xs text-slate-400 mb-2">
                                        Upload PDF chỉ chứa bảng đáp án để AI quét tự động
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="file"
                                            accept=".pdf"
                                            ref={answerPdfRef}
                                            onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAIScan}
                                            disabled={!answerPdfFile || scanning}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 min-w-[120px]"
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
                                        <div className="text-sm space-y-1">
                                            <p className="text-green-400">
                                                ✓ Đã quét: {scanResult.multiple_choice?.length || 0} câu trắc nghiệm
                                            </p>
                                            {scanResult.true_false?.length > 0 && (
                                                <p className="text-blue-400">
                                                    + {scanResult.true_false.length} câu đúng/sai
                                                </p>
                                            )}
                                            {scanResult.short_answer?.length > 0 && (
                                                <p className="text-yellow-400">
                                                    + {scanResult.short_answer.length} câu trả lời ngắn
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        Upload file PDF chỉ chứa bảng đáp án để AI quét chính xác hơn
                                    </p>
                                </div>

                                {/* Answer Key - Manual or from AI */}
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Đáp án (tự động điền từ AI hoặc nhập tay)</Label>
                                    <Textarea
                                        value={answerKey}
                                        onChange={(e) => setAnswerKey(e.target.value)}
                                        placeholder="1A,2B,3C,4D,5A,6B,7C,8D,9A,10B..."
                                        className="bg-slate-700/50 border-slate-600 text-white font-mono"
                                        rows={3}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Format: 1A,2B hoặc 1.A,2.B - Có thể sửa lại sau khi AI quét
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreate(false)
                                            resetForm()
                                        }}
                                        className="flex-1 border-slate-600 text-slate-400"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-4xl h-[90vh] bg-slate-800 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h3 className="text-white font-semibold">{previewExam.title}</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewExam(null)}
                                className="text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <iframe
                            src={previewExam.pdf_url}
                            className="w-full h-full"
                            title="PDF Preview"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
