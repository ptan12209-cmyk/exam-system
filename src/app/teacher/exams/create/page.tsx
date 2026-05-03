"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { cn } from "@/lib/utils"
import { SUBJECTS } from "@/lib/subjects"
import {
  ArrowLeft,
  Clock,
  GraduationCap,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  CheckCircle2,
  Eye,
} from "lucide-react"

const OPTIONS = ["A", "B", "C", "D"] as const

type Option = (typeof OPTIONS)[number]
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

export default function CreateExamPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerPdfRef = useRef<HTMLInputElement>(null)

  const [fullName] = useState("")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("other")
  const [duration, setDuration] = useState(15)
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [isScheduled, setIsScheduled] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [enableTF, setEnableTF] = useState(false)
  const [enableSA, setEnableSA] = useState(false)
  const [mcCount, setMcCount] = useState(12)
  const [tfCount, setTfCount] = useState(4)
  const [saCount, setSaCount] = useState(6)
  const [correctAnswers, setCorrectAnswers] = useState<(Option | null)[]>(Array(12).fill(null))
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
  const [sendNotification, setSendNotification] = useState(true)
  const [scoreVisibilityMode, setScoreVisibilityMode] = useState<"always" | "never" | "threshold">("always")
  const [scoreThreshold, setScoreThreshold] = useState(5.0)
  const [securityLevel, setSecurityLevel] = useState(1)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [createdExamId, setCreatedExamId] = useState<string | null>(null)

  const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000"

  const parseAnswerKey = (input: string): Record<number, string> => {
    const result: Record<number, string> = {}
    for (const part of input.split(/[,;\s]+/).filter(Boolean)) {
      const match = part.match(/(\d+)[.\-]?([A-Da-d])/) 
      if (match) result[parseInt(match[1])] = match[2].toUpperCase()
    }
    return result
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
      const safeFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
      const fileName = `${user.id}/${Date.now()}_${safeFileName}`
      const { error: uploadError } = await supabase.storage.from("exam-pdfs").upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from("exam-pdfs").getPublicUrl(fileName)
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
    if (!targetFile) return setError("Vui lòng upload file PDF đáp án trước")

    setParsingPdf(true)
    setError(null)
    setParseSuccess(false)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    try {
      const formData = new FormData()
      formData.append("file", targetFile)
      const response = await fetch(`${WORKER_URL}/extract-answers`, { method: "POST", body: formData, signal: controller.signal })
      if (!response.ok) throw new Error((await response.json().catch(() => ({} as { detail?: string }))).detail || "Không thể parse PDF")
      const data = await response.json()
      const mcData = Array.isArray(data.multiple_choice) ? data.multiple_choice : []
      const parsedMc = mcData
        .filter((a: string) => ["A", "B", "C", "D"].includes(String(a).toUpperCase()))
        .map((a: string) => a.toUpperCase() as Option)

      if (parsedMc.length > 0) {
        setMcAnswers(parsedMc)
        setCorrectAnswers(parsedMc)
        setMcCount(parsedMc.length)
      }

      const tfData = Array.isArray(data.true_false) ? data.true_false : []
      if (tfData.length > 0) {
        setTfAnswers(
          tfData.map((tf: { a?: boolean; b?: boolean; c?: boolean; d?: boolean }, index: number) => ({
            question: parsedMc.length + 1 + index,
            a: tf.a ?? true,
            b: tf.b ?? true,
            c: tf.c ?? true,
            d: tf.d ?? true,
          }))
        )
        setTfCount(tfData.length)
        setEnableTF(true)
      }

      const saData = Array.isArray(data.short_answer) ? data.short_answer : []
      if (saData.length > 0) {
        const tfLen = tfData.length
        setSaAnswers(saData.map((sa: { answer: number | string }, index: number) => ({ question: parsedMc.length + tfLen + 1 + index, answer: sa.answer })))
        setSaCount(saData.length)
        setEnableSA(true)
      }

      if (parsedMc.length || tfData.length || saData.length) setParseSuccess(true)
      else throw new Error("Không tìm thấy đáp án trong PDF")
    } catch (err) {
      setError((err as Error).name === "AbortError" ? "Quá thời gian chờ (90s)." : "Lỗi parse PDF: " + (err as Error).message)
    } finally {
      clearTimeout(timeout)
      setParsingPdf(false)
    }
  }

  const handleSave = async (publish = false) => {
    if (!title.trim()) return setError("Vui lòng nhập tên đề thi")
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Chưa đăng nhập")

      const effectiveTf = enableTF ? tfCount : 0
      const effectiveSa = enableSA ? saCount : 0
      const parsedAnswers = parseAnswerKey(mcAnswers.length > 0 ? mcAnswers.filter(Boolean).join(",") : correctAnswers.filter(Boolean).join(","))
      const mcAnswerObjects = (mcAnswers.length > 0 ? mcAnswers : correctAnswers)
        .map((answer, index) => ({ question: index + 1, answer }))
        .filter((item) => item.answer !== null)

      const finalTfAnswers = enableTF
        ? tfAnswers.length
          ? tfAnswers
          : Array.from({ length: tfCount }, (_, i) => ({ question: mcCount + 1 + i, a: true, b: true, c: true, d: true }))
        : []

      const finalSaAnswers = enableSA
        ? saAnswers.length
          ? saAnswers
          : Array.from({ length: saCount }, (_, i) => ({ question: mcCount + effectiveTf + 1 + i, answer: "" }))
        : []

      const { data, error: insertError } = await supabase
        .from("exams")
        .insert({
          teacher_id: user.id,
          title: title.trim(),
          subject,
          duration,
          total_questions: mcCount + effectiveTf + effectiveSa,
          correct_answers: Object.values(parsedAnswers).length ? Object.values(parsedAnswers) : mcAnswers.length > 0 ? mcAnswers : correctAnswers,
          mc_answers: mcAnswerObjects,
          tf_answers: finalTfAnswers,
          sa_answers: finalSaAnswers,
          pdf_url: pdfUrl,
          max_attempts: maxAttempts,
          status: publish ? "published" : "draft",
          is_scheduled: isScheduled,
          start_time: isScheduled && startTime ? new Date(startTime).toISOString() : null,
          end_time: isScheduled && endTime ? new Date(endTime).toISOString() : null,
          score_visibility_mode: scoreVisibilityMode,
          score_visibility_threshold: scoreVisibilityMode === "threshold" ? scoreThreshold : null,
          security_level: securityLevel,
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (data) {
        setCreatedExamId(data.id)
        setShowLinkDialog(true)
        // Redirect to dashboard after successful save
        router.push("/teacher/dashboard")
      }

      if (publish && sendNotification && data) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
        const { data: students } = await supabase.from("profiles").select("id").eq("role", "student")
        if (students?.length) {
          await supabase.from("notifications").insert(
            students.map((s: { id: string }) => ({
              user_id: s.id,
              title: `Đề thi mới: ${title.trim()}`,
              message: `${profile?.full_name || "Giáo viên"} đã đăng đề thi mới`,
              type: "exam",
              link: `/student/exams/${data.id}/take`,
              is_read: false,
            }))
          )
        }
      }
    } catch (err) {
      setError("Lỗi lưu đề thi: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const totalQuestions = mcCount + (enableTF ? tfCount : 0) + (enableSA ? saCount : 0)

  return (
    <TeacherShell onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }}>
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 px-4 backdrop-blur-xl lg:hidden safe-top">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]/60">
            <div className="h-3.5 w-3.5 rounded-full border border-[hsl(var(--foreground))]/60" />
          </div>
          <span className="text-lg font-bold tracking-tight">ExamHub</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu userName={fullName} userClass="Giáo viên" onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} role="teacher" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:px-10 lg:pt-28">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
              <GraduationCap className="h-4 w-4" /> Create exam
            </div>
            <h1 className="max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Tạo đề thi mới</h1>
            <p className="mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
              Thiết lập đề, nhập đáp án và phát hành với trải nghiệm gọn, rõ, thống nhất theo landing page.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <div className="grid gap-3 text-sm text-[hsl(var(--muted-foreground))]">
              <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-3"><span>Trạng thái</span><span className="font-medium">{step === "info" ? "Thông tin" : "Đáp án"}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-3"><span>Câu trắc nghiệm</span><span className="font-medium">{mcCount}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-3"><span>Tổng câu</span><span className="font-medium">{totalQuestions}</span></div>
            </div>
          </div>
        </section>

        {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="mt-10 inline-flex rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-1">
          <button onClick={() => setStep("info")} className={cn("rounded-full px-5 py-2.5 text-sm font-medium transition-colors", step === "info" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]")}>Thông tin</button>
          <button onClick={() => setStep("answers")} className={cn("rounded-full px-5 py-2.5 text-sm font-medium transition-colors", step === "answers" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]")}>Đáp án</button>
        </div>

        {step === "info" ? (
          <section className="mt-8 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tên đề thi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Đề thi HK1 Vật Lý 12" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Môn học</Label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">
                  {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Thời lượng (phút)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Số lần làm</Label>
                <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className="rounded-xl" />
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                <Label className="mb-2 block">Upload đề thi PDF</Label>
                <div className="flex gap-2">
                  <Input ref={fileInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} className="rounded-xl" />
                  <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  {uploadingPdf ? "Đang tải lên..." : pdfUrl ? "Đã upload PDF" : "Chưa có file"}
                </p>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                <Label className="mb-2 block">Thiết lập nâng cao</Label>
                <div className="grid gap-3 text-sm">
                  <label className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))]/60 p-3">
                    <span>Ẩn/hiện điểm</span>
                    <select value={scoreVisibilityMode} onChange={(e) => setScoreVisibilityMode(e.target.value as typeof scoreVisibilityMode)} className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-2 py-1 text-sm">
                      <option value="always">Luôn hiện</option>
                      <option value="never">Luôn ẩn</option>
                      <option value="threshold">Theo ngưỡng</option>
                    </select>
                  </label>
                  {scoreVisibilityMode === "threshold" && <label className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))]/60 p-3"><span>Ngưỡng điểm</span><Input type="number" value={scoreThreshold} onChange={(e) => setScoreThreshold(Number(e.target.value))} className="w-24 rounded-lg" /></label>}
                  <label className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))]/60 p-3"><span>Bật lịch thi</span><input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} /></label>
                  {isScheduled && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded-xl" />
                      <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="rounded-xl" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setAnswerTab("mc")} className={cn("rounded-full px-4 py-2 text-sm", answerTab === "mc" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]")}>Trắc nghiệm</button>
              <button onClick={() => setAnswerTab("tf")} className={cn("rounded-full px-4 py-2 text-sm", answerTab === "tf" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]")}>Đúng/Sai</button>
              <button onClick={() => setAnswerTab("sa")} className={cn("rounded-full px-4 py-2 text-sm", answerTab === "sa" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]")}>Tự luận</button>
              <div className="ml-auto flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><Clock className="h-4 w-4" />{totalQuestions} câu</div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                <Label className="mb-2 block">PDF đáp án</Label>
                <div className="flex gap-2">
                  <Input ref={answerPdfRef} type="file" accept=".pdf" onChange={(e) => setAnswerPdfFile(e.target.files?.[0] || null)} className="rounded-xl" />
                  <Button type="button" onClick={() => void parsePdfAnswers()} disabled={parsingPdf} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                    {parsingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
                {parseSuccess && <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Đã quét đáp án thành công</p>}
              </div>

              {answerTab === "mc" && (
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Đáp án trắc nghiệm</h3><span className="text-sm text-[hsl(var(--muted-foreground))]">{mcCount} câu</span></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: mcCount }, (_, i) => (
                      <label key={i} className="space-y-2 rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                        <span className="text-sm font-medium">Câu {i + 1}</span>
                        <select value={correctAnswers[i] || ""} onChange={(e) => {
                          const next = [...correctAnswers]
                          next[i] = e.target.value as Option
                          setCorrectAnswers(next)
                        }} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">
                          <option value="">Chọn đáp án</option>
                          {OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {answerTab === "tf" && (
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Đúng / Sai</h3><span className="text-sm text-[hsl(var(--muted-foreground))]">{tfCount} câu</span></div>
                  <div className="space-y-3">
                    {Array.from({ length: tfCount }, (_, i) => {
                      const item = tfAnswers[i] || { question: mcCount + i + 1, a: true, b: true, c: true, d: true }
                      return (
                        <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                          <div className="mb-3 flex items-center justify-between"><span className="font-medium">Câu {item.question}</span></div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {(["a", "b", "c", "d"] as const).map((key) => (
                              <label key={key} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))]/60 px-3 py-2 text-sm">
                                <span>{key.toUpperCase()}</span>
                                <input type="checkbox" checked={item[key]} onChange={(e) => {
                                  const next = [...tfAnswers]
                                  next[i] = { ...item, [key]: e.target.checked }
                                  setTfAnswers(next)
                                }} />
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {answerTab === "sa" && (
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Tự luận / Ngắn</h3><span className="text-sm text-[hsl(var(--muted-foreground))]">{saCount} câu</span></div>
                  <div className="space-y-3">
                    {Array.from({ length: saCount }, (_, i) => {
                      const item = saAnswers[i] || { question: mcCount + (enableTF ? tfCount : 0) + i + 1, answer: "" }
                      return (
                        <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                          <Label className="mb-2 block">Câu {item.question}</Label>
                          <Input value={String(item.answer)} onChange={(e) => {
                            const next = [...saAnswers]
                            next[i] = { ...item, answer: e.target.value }
                            setSaAnswers(next)
                          }} className="rounded-xl" placeholder="Nhập đáp án..." />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-4 text-sm">
                  <span>Gửi thông báo cho học sinh</span>
                  <input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))]/60 p-4 text-sm">
                  <span>Mức bảo mật</span>
                  <select value={securityLevel} onChange={(e) => setSecurityLevel(Number(e.target.value))} className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">
                    <option value={1}>Thấp</option>
                    <option value={2}>Trung bình</option>
                    <option value={3}>Cao</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
          <Button type="button" onClick={() => void handleSave(false)} disabled={loading} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>
              <Eye className="mr-2 h-4 w-4" /> Lưu nháp
            </>}
          </Button>
          <Button type="button" onClick={() => void handleSave(true)} disabled={loading} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>
              <Wand2 className="mr-2 h-4 w-4" /> Lưu & phát hành
            </>}
          </Button>
        </div>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
