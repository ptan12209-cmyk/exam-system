"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FilterBar, EmptyState } from "@/components/shared"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react"

interface ExamInBank {
  id: string
  title: string
  subject: string
  description: string | null
  pdf_url: string | null
  answer_key: string | null
  total_questions: number
  created_at: string
  questions?: Array<{ question: string; options: string[]; answer: string }>
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
  const [scanResult, setScanResult] = useState<{ multiple_choice?: string[]; true_false?: string[] } | null>(null)
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("physics")
  const [description, setDescription] = useState("")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState("")
  const [answerKey, setAnswerKey] = useState("")
  const [totalQuestions, setTotalQuestions] = useState(30)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewExam, setPreviewExam] = useState<ExamInBank | null>(null)

  const fetchExams = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push("/login")

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    setFullName(profile?.full_name || "")

    const { data } = await supabase.from("exams").select("*").eq("created_by", user.id).order("created_at", { ascending: false })
    setExams((data || []).map((e: ExamInBank) => ({ ...e, subject: e.subject || "physics", total_questions: e.total_questions || 0 })))
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    void fetchExams()
  }, [fetchExams])

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

  const handleAIScan = async () => {
    if (!answerPdfFile) return alert("Vui lòng chọn file PDF đáp án")
    setScanning(true)
    setScanResult(null)
    try {
      const formData = new FormData()
      formData.append("file", answerPdfFile)
      const response = await fetch(`${WORKER_URL}/extract-answers`, { method: "POST", body: formData })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setScanResult(data)
      if (data.multiple_choice?.length) {
        setAnswerKey(data.multiple_choice.map((ans: string, idx: number) => `${idx + 1}${ans}`).join(","))
        setTotalQuestions(data.multiple_choice.length)
      }
    } catch (err) {
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
      const { error } = await supabase.storage.from("exams").upload(fileName, pdfFile)
      if (error) throw error
      const { data: urlData } = supabase.storage.from("exams").getPublicUrl(fileName)
      setPdfUrl(urlData.publicUrl)
    } catch (err) {
      alert("Lỗi upload PDF: " + (err as Error).message)
    } finally {
      setUploadingPdf(false)
    }
  }

  const parseAnswerKey = (input: string): Record<number, string> => {
    const result: Record<number, string> = {}
    for (const part of input.split(/[,;\s]+/).filter(Boolean)) {
      const match = part.match(/(\d+)[.\-]?([A-Da-d])/) 
      if (match) result[parseInt(match[1])] = match[2].toUpperCase()
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return alert("Vui lòng nhập tên đề thi")
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const parsedAnswers = parseAnswerKey(answerKey)
      const questions = Object.entries(parsedAnswers).map(([num, ans]) => ({ question: `Câu ${num}`, options: ["A", "B", "C", "D"], answer: ans }))
      const data = { title, subject, description: description || null, pdf_url: pdfUrl || null, answer_key: answerKey || null, total_questions: totalQuestions, questions: questions.length > 0 ? questions : null, status: "published", created_by: user.id }
      const query = editingId ? supabase.from("exams").update(data).eq("id", editingId) : supabase.from("exams").insert(data)
      const { error } = await query
      if (error) throw error
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
    const examToDelete = exams.find((e) => e.id === id)
    if (!confirm(`Xóa đề thi "${examToDelete?.title}"?`)) return
    try {
      const { data: submissions } = await supabase.from("submissions").select("student_id").eq("exam_id", id)
      if (submissions?.length) {
        const notifications = [...new Set(submissions.map((s: { student_id: string }) => s.student_id))].map((studentId) => ({
          user_id: studentId,
          type: "exam_deleted",
          title: "Đề thi đã bị xóa",
          message: `Đề thi "${examToDelete?.title}" đã bị giáo viên xóa khỏi hệ thống.`,
          is_read: false,
        }))
        await supabase.from("notifications").insert(notifications)
      }
      await supabase.from("exam_participants").delete().eq("exam_id", id)
      await supabase.from("exam_sessions").delete().eq("exam_id", id)
      await supabase.from("submission_audit_log").delete().eq("exam_id", id)
      await supabase.from("submissions").delete().eq("exam_id", id)
      const { error } = await supabase.from("exams").delete().eq("id", id)
      if (error) throw error
      await fetchExams()
    } catch (err) {
      alert("Lỗi xóa: " + (err as Error).message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return <Loading fullPage label="Đang tải kho đề thi..." />
  }

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]/60">
            <div className="h-3.5 w-3.5 rounded-full border border-[hsl(var(--foreground))]/60" />
          </div>
          <span className="text-lg font-bold tracking-tight">ExamHub</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={fullName} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-24 md:px-10 lg:pt-28">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
              <FileText className="h-4 w-4" /> Exam bank
            </div>
            <h1 className="max-w-4xl font-serif-italic text-5xl tracking-[-2px] md:text-7xl lg:text-8xl">Ngân hàng đề thi</h1>
            <p className="mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">Lưu trữ, xem trước và quản lý các đề thi của bạn ở một nơi.</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-6">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng đề đã lưu</p>
            <div className="mt-2 text-3xl font-semibold">{exams.length}</div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Dùng để tạo đề nhanh hơn</p>
          </div>
        </section>

        <div className="mt-10 flex gap-3">
          <Button onClick={() => { resetForm(); setShowCreate(true) }} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            <Plus className="mr-2 h-4 w-4" />Thêm đề thi
          </Button>
        </div>

        <div className="mt-6">
          <FilterBar searchPlaceholder="Tìm kiếm đề thi..." showFilter={false} className="mb-6" />
        </div>

        {exams.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={FileText} title="Chưa có đề thi nào" description="Tạo đề thi đầu tiên bằng cách upload PDF và đáp án." actionLabel="Thêm đề thi đầu tiên" onAction={() => setShowCreate(true)} iconColor="text-indigo-500" iconBgColor="bg-indigo-50 dark:bg-indigo-900/30" />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <article key={exam.id} className="overflow-hidden rounded-[2rem] liquid-glass shadow-sm">
                <div className="border-b border-[hsl(var(--border))]/50 p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-lg font-semibold">{exam.title}</h3>
                    {exam.pdf_url ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"><CheckCircle className="mr-1 h-3 w-3" />PDF</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600"><AlertTriangle className="mr-1 h-3 w-3" />No PDF</span>
                    )}
                  </div>
                  <p className="inline-flex rounded-full bg-[hsl(var(--muted))]/20 px-2.5 py-0.5 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    {SUBJECTS.find((s) => s.value === exam.subject)?.label || exam.subject}
                  </p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 opacity-50" /><span>{exam.total_questions} câu hỏi</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 opacity-50" /><span>{new Date(exam.created_at).toLocaleDateString("vi-VN")}</span></div>
                  </div>
                  <div className="flex gap-2 border-t border-[hsl(var(--border))]/30 pt-2">
                    {exam.pdf_url && <Button variant="outline" size="sm" onClick={() => setPreviewExam(exam)} className="flex-1 rounded-full"><Eye className="mr-1 h-4 w-4" />Xem</Button>}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(exam)} className="flex-1 rounded-full">Sửa</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(exam.id)} className="rounded-full"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
            <div className="my-8 w-full max-w-2xl rounded-[2rem] liquid-glass shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="text-xl font-semibold">{editingId ? "Cập nhật đề thi" : "Thêm đề thi mới"}</h2>
                <button onClick={() => { setShowCreate(false); resetForm() }} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"><X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 p-5">
                <section className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2"><Label>Tên đề thi <span className="text-red-500">*</span></Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đề thi HK1 Vật Lý 12" className="rounded-xl" required /></div>
                  <div className="space-y-2"><Label>Môn học</Label><select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">{SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                </section>
                <div className="space-y-2"><Label>Mô tả</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết về đề thi..." className="rounded-xl" rows={2} /></div>
                <section className="rounded-2xl border border-indigo-200/50 bg-indigo-50/40 p-4">
                  <Label className="mb-2 flex items-center gap-2 font-semibold text-indigo-700"><FileText className="h-4 w-4" />File đề thi (PDF)</Label>
                  <div className="flex gap-2">
                    <Input type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="rounded-xl" />
                    <Button type="button" onClick={handlePdfUpload} disabled={!pdfFile || uploadingPdf} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">{uploadingPdf ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : <Upload className="h-4 w-4" />}</Button>
                  </div>
                  {pdfUrl && <p className="mt-2 flex items-center text-sm text-emerald-600"><CheckCircle className="mr-1 h-3 w-3" />Đã tải lên: {pdfUrl.split("/").pop()}</p>}
                </section>
                <section className="rounded-2xl border border-violet-200/50 bg-violet-50/40 p-4">
                  <Label className="mb-2 flex items-center gap-2 font-semibold text-violet-700"><Wand2 className="h-4 w-4" />File đáp án & Quét AI</Label>
                  <div className="mb-3 flex gap-2">
                    <Input type="file" accept=".pdf" ref={answerPdfRef} onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)} className="rounded-xl" />
                    <Button type="button" onClick={handleAIScan} disabled={!answerPdfFile || scanning} className="rounded-full bg-violet-600 text-white hover:bg-violet-700">{scanning ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}Quét AI</Button>
                  </div>
                  {scanResult && <div className="mb-3 rounded-xl border border-violet-200/50 bg-[hsl(var(--card))] p-3 text-sm"><p className="font-medium text-emerald-600">✓ Tìm thấy: {scanResult.multiple_choice?.length || 0} câu trắc nghiệm</p>{scanResult.true_false?.length ? <p className="font-medium text-indigo-600">+ {scanResult.true_false.length} câu đúng/sai</p> : null}</div>}
                  <div className="space-y-2"><div className="flex justify-between"><Label className="text-xs font-medium">Chuỗi đáp án</Label><span className="text-xs text-[hsl(var(--muted-foreground))]">Định dạng: 1A,2B,3C...</span></div><Textarea value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="1A,2B,3C,4D..." className="rounded-xl font-mono text-sm" rows={3} /></div>
                </section>
                <div className="space-y-2"><Label>Tổng số câu hỏi</Label><Input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(Number(e.target.value))} min={1} max={200} className="w-32 rounded-xl" /></div>
                <div className="flex gap-3 border-t border-[hsl(var(--border))]/50 pt-4"><Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm() }} className="flex-1 rounded-full">Hủy</Button><Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">{saving ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : editingId ? "Cập nhật" : "Lưu đề thi"}</Button></div>
              </form>
            </div>
          </div>
        )}

        {previewExam?.pdf_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
            <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] liquid-glass shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-4">
                <h3 className="font-semibold">{previewExam.title}</h3>
                <button onClick={() => setPreviewExam(null)} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"><X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" /></button>
              </div>
              <iframe src={previewExam.pdf_url} className="flex-1 bg-[hsl(var(--muted))]/30" title="PDF Preview" />
            </div>
          </div>
        )}
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
