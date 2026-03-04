"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    answer_key: string | null
    total_questions: number
    created_at: string
    questions?: Array<{ question: string, options: string[], answer: string }>
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

    const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null)
    const [scanning, setScanning] = useState(false)
    const [scanResult, setScanResult] = useState<{ multiple_choice?: string[], true_false?: string[] } | null>(null)

    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("physics")
    const [description, setDescription] = useState("")
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfUrl, setPdfUrl] = useState("")
    const [answerKey, setAnswerKey] = useState("")
    const [totalQuestions, setTotalQuestions] = useState(30)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [previewExam, setPreviewExam] = useState<ExamInBank | null>(null)

    useEffect(() => { fetchExams() }, [])

    const fetchExams = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }

        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
        if (profile) setFullName(profile.full_name || "")

        const { data: examsData } = await supabase.from("exams").select("*").eq("created_by", user.id).order("created_at", { ascending: false })
        if (examsData) {
            setExams(examsData.map((e: { id: string, title: string, subject: string, description: string | null, pdf_url: string | null, answer_key: string | null, total_questions: number, created_at: string, questions: Array<{ question: string, options: string[], answer: string }> }) => ({
                id: e.id, title: e.title, subject: e.subject || "physics", description: e.description,
                pdf_url: e.pdf_url, answer_key: e.answer_key, total_questions: e.total_questions || 0,
                created_at: e.created_at, questions: e.questions
            })))
        }
        setLoading(false)
    }

    const resetForm = () => { setTitle(""); setSubject("physics"); setDescription(""); setPdfFile(null); setPdfUrl(""); setAnswerKey(""); setTotalQuestions(30); setEditingId(null); setAnswerPdfFile(null); setScanResult(null) }

    const handleAIScan = async () => {
        if (!answerPdfFile) { alert("Vui lòng chọn file PDF đáp án"); return }
        setScanning(true); setScanResult(null)
        try {
            const formData = new FormData(); formData.append("file", answerPdfFile)
            const response = await fetch(`${WORKER_URL}/extract-answers`, { method: "POST", body: formData })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json(); setScanResult(data)
            if (data.multiple_choice && data.multiple_choice.length > 0) {
                setAnswerKey(data.multiple_choice.map((ans: string, idx: number) => `${idx + 1}${ans}`).join(","))
                setTotalQuestions(data.multiple_choice.length)
            }
        } catch (err) { alert("Lỗi quét AI: " + (err as Error).message + "\n\nĐảm bảo Python worker đang chạy!") }
        finally { setScanning(false) }
    }

    const handleEdit = (exam: ExamInBank) => { setEditingId(exam.id); setTitle(exam.title); setSubject(exam.subject); setDescription(exam.description || ""); setPdfUrl(exam.pdf_url || ""); setAnswerKey(exam.answer_key || ""); setTotalQuestions(exam.total_questions); setShowCreate(true) }

    const handlePdfUpload = async () => {
        if (!pdfFile) return; setUploadingPdf(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            const fileName = `${user.id}/${Date.now()}_${pdfFile.name}`
            const { error } = await supabase.storage.from("exams").upload(fileName, pdfFile)
            if (error) throw error
            const { data: urlData } = supabase.storage.from("exams").getPublicUrl(fileName)
            setPdfUrl(urlData.publicUrl)
        } catch (err) { alert("Lỗi upload PDF: " + (err as Error).message) }
        finally { setUploadingPdf(false) }
    }

    const parseAnswerKey = (input: string): Record<number, string> => {
        const result: Record<number, string> = {}
        const parts = input.split(/[,;\s]+/).filter(Boolean)
        for (const part of parts) { const match = part.match(/(\d+)[.\-]?([A-Da-d])/); if (match) result[parseInt(match[1])] = match[2].toUpperCase() }
        return result
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!title) { alert("Vui lòng nhập tên đề thi"); return }
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            const parsedAnswers = parseAnswerKey(answerKey)
            const questions = Object.entries(parsedAnswers).map(([num, ans]) => ({ question: `Câu ${num}`, options: ["A", "B", "C", "D"], answer: ans }))
            const data = { title, subject, description: description || null, pdf_url: pdfUrl || null, answer_key: answerKey || null, total_questions: totalQuestions, questions: questions.length > 0 ? questions : null, status: "published", created_by: user.id }
            if (editingId) { const { error } = await supabase.from("exams").update(data).eq("id", editingId); if (error) throw error }
            else { const { error } = await supabase.from("exams").insert(data); if (error) throw error }
            await fetchExams(); setShowCreate(false); resetForm()
        } catch (err) { alert("Lỗi: " + (err as Error).message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        const examToDelete = exams.find(e => e.id === id)
        if (!confirm(`Xóa đề thi "${examToDelete?.title}"?`)) return
        try {
            const { data: submissions } = await supabase.from("submissions").select("student_id").eq("exam_id", id)
            if (submissions && submissions.length > 0) {
                const studentIds = [...new Set(submissions.map((s: { student_id: string }) => s.student_id))]
                const notifications = studentIds.map(studentId => ({ user_id: studentId, type: "exam_deleted", title: "Đề thi đã bị xóa", message: `Đề thi "${examToDelete?.title}" đã bị giáo viên xóa khỏi hệ thống.`, is_read: false }))
                await supabase.from("notifications").insert(notifications)
            }
            // Delete child records first (in case ON DELETE CASCADE is missing)
            await supabase.from("exam_participants").delete().eq("exam_id", id)
            await supabase.from("exam_sessions").delete().eq("exam_id", id)
            await supabase.from("submission_audit_log").delete().eq("exam_id", id)
            await supabase.from("submissions").delete().eq("exam_id", id)
            // Now delete the exam
            const { error } = await supabase.from("exams").delete().eq("id", id)
            if (error) throw error
            await fetchExams()
        } catch (err) {
            console.error("Delete exam error:", err)
            alert("Lỗi xóa: " + (err as Error).message)
        }
    }

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex">
            <TeacherSidebar onLogout={handleLogout} />

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                </div>
            </header>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-6 h-6 text-indigo-500" />
                            Ngân hàng Đề thi
                        </h1>
                        <p className="text-muted-foreground">Lưu trữ và quản lý đề thi của bạn</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={() => { resetForm(); setShowCreate(true) }} className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                            <Plus className="w-4 h-4 mr-2" />Thêm đề thi
                        </Button>
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
                    </div>
                </div>

                {/* Mobile add button */}
                <div className="lg:hidden mb-4">
                    <Button onClick={() => { resetForm(); setShowCreate(true) }} className="w-full gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                        <Plus className="w-4 h-4 mr-2" />Thêm đề thi
                    </Button>
                </div>

                <FilterBar searchPlaceholder="Tìm kiếm đề thi..." showFilter={false} className="mb-6" />

                {exams.length === 0 ? (
                    <EmptyState icon={FileText} title="Chưa có đề thi nào" description="Tạo đề thi đầu tiên bằng cách upload PDF và đáp án" actionLabel="Thêm đề thi đầu tiên" onAction={() => setShowCreate(true)} iconColor="text-indigo-500" iconBgColor="bg-indigo-50 dark:bg-indigo-900/30" />
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => (
                            <div key={exam.id} className="glass-card rounded-2xl hover:shadow-xl transition-all duration-300 group overflow-hidden">
                                <div className="p-5 border-b border-border/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-lg font-bold text-foreground line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={exam.title}>{exam.title}</h3>
                                        {exam.pdf_url ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                <CheckCircle className="w-3 h-3 mr-1" />PDF
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                                <AlertTriangle className="w-3 h-3 mr-1" />No PDF
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 gradient-primary-soft px-2.5 py-0.5 rounded-full w-fit">
                                        {SUBJECTS.find(s => s.value === exam.subject)?.label || exam.subject}
                                    </p>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-muted-foreground/50" /><span>{exam.total_questions} câu hỏi</span></div>
                                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground/50" /><span>{new Date(exam.created_at).toLocaleDateString("vi-VN")}</span></div>
                                    </div>
                                    <div className="flex gap-2 pt-2 border-t border-border/30">
                                        {exam.pdf_url && (
                                            <Button variant="outline" size="sm" onClick={() => setPreviewExam(exam)} className="flex-1 border-border text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                                                <Eye className="w-4 h-4 mr-1" />Xem
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(exam)} className="flex-1 border-border text-muted-foreground hover:text-foreground">Sửa</Button>
                                        <Button variant="outline" size="sm" onClick={() => handleDelete(exam.id)} className="border-border text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="glass-card w-full max-w-2xl rounded-2xl shadow-2xl my-8">
                            <div className="flex items-center justify-between p-5 border-b border-border/50">
                                <h2 className="text-foreground text-xl font-bold">{editingId ? "Cập nhật đề thi" : "Thêm đề thi mới"}</h2>
                                <button onClick={() => { setShowCreate(false); resetForm() }} className="p-2 rounded-full hover:bg-muted transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="p-5">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-foreground font-medium">Tên đề thi <span className="text-red-500">*</span></Label>
                                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đề thi HK1 Vật Lý 12" className="bg-card border-border focus:ring-indigo-500 focus:border-indigo-500 text-foreground" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground font-medium">Môn học</Label>
                                            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-card text-foreground">
                                                {SUBJECTS.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Mô tả</Label>
                                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết về đề thi..." className="bg-card border-border focus:ring-indigo-500 focus:border-indigo-500 resize-none text-foreground" rows={2} />
                                    </div>

                                    {/* Exam PDF upload */}
                                    <div className="p-4 gradient-primary-soft rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
                                        <Label className="text-indigo-800 dark:text-indigo-400 font-semibold flex items-center gap-2 mb-2"><FileText className="w-4 h-4" />File đề thi (PDF)</Label>
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400/70 mb-3">File này sẽ được hiển thị cho học sinh khi làm bài.</p>
                                        <div className="flex gap-2">
                                            <Input type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="bg-card border-indigo-200 dark:border-indigo-800 text-foreground file:bg-indigo-100 dark:file:bg-indigo-900/30 file:text-indigo-700 dark:file:text-indigo-400 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs" />
                                            <Button type="button" onClick={handlePdfUpload} disabled={!pdfFile || uploadingPdf} className="gradient-primary text-white border-0 min-w-[40px]">
                                                {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        {pdfUrl && <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 flex items-center"><CheckCircle className="w-3 h-3 mr-1" />Đã tải lên: {pdfUrl.split('/').pop()}</p>}
                                    </div>

                                    {/* AI Answer scan */}
                                    <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-200/50 dark:border-violet-800/30">
                                        <Label className="text-violet-800 dark:text-violet-400 font-semibold flex items-center gap-2 mb-2"><Wand2 className="w-4 h-4" />File đáp án & Quét AI</Label>
                                        <p className="text-xs text-violet-600 dark:text-violet-400/70 mb-3">Tải lên PDF đáp án để AI tự động trích xuất hoặc nhập tay bên dưới.</p>
                                        <div className="flex gap-2 mb-3">
                                            <Input type="file" accept=".pdf" ref={answerPdfRef} onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)} className="bg-card border-violet-200 dark:border-violet-800 text-foreground file:bg-violet-100 dark:file:bg-violet-900/30 file:text-violet-700 dark:file:text-violet-400 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs" />
                                            <Button type="button" onClick={handleAIScan} disabled={!answerPdfFile || scanning} className="bg-violet-600 hover:bg-violet-700 text-white whitespace-nowrap">
                                                {scanning ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang quét...</>) : (<><Sparkles className="w-4 h-4 mr-2" />Quét AI</>)}
                                            </Button>
                                        </div>
                                        {scanResult && (
                                            <div className="text-sm space-y-1 mb-3 p-2 bg-card rounded-lg border border-violet-200/50 dark:border-violet-800/30">
                                                <p className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Tìm thấy: {scanResult.multiple_choice?.length || 0} câu trắc nghiệm</p>
                                                {scanResult.true_false && scanResult.true_false.length > 0 && (<p className="text-indigo-600 font-medium">+ {scanResult.true_false.length} câu đúng/sai</p>)}
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="flex justify-between"><Label className="text-foreground font-medium text-xs">Chuỗi đáp án</Label><span className="text-xs text-muted-foreground">Định dạng: 1A,2B,3C...</span></div>
                                            <Textarea value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="1A,2B,3C,4D..." className="bg-card border-border font-mono text-sm text-foreground" rows={3} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-foreground font-medium">Tổng số câu hỏi</Label>
                                        <Input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} min={1} max={200} className="bg-card border-border text-foreground w-32" />
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t border-border/50">
                                        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm() }} className="flex-1 border-border text-muted-foreground">Hủy</Button>
                                        <Button type="submit" disabled={saving} className="flex-1 gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : editingId ? "Cập nhật" : "Lưu đề thi"}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* PDF Preview Modal */}
                {previewExam && previewExam.pdf_url && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="w-full max-w-5xl h-[90vh] glass-card rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-4 border-b border-border/50">
                                <h3 className="text-foreground font-semibold text-lg">{previewExam.title}</h3>
                                <button onClick={() => setPreviewExam(null)} className="p-2 rounded-full hover:bg-muted transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <iframe src={previewExam.pdf_url} className="w-full flex-1 bg-muted/30" title="PDF Preview" />
                        </div>
                    </div>
                )}
            </main>

            <TeacherBottomNav />
        </div>
    )
}
