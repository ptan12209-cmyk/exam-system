"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useExamForm } from "@/hooks/useExamForm"
import { useAnswerForm } from "@/hooks/useAnswerForm"
import { usePdfUpload } from "@/hooks/usePdfUpload"
import { createClient } from "@/lib/supabase/client"
import { parseAnswerKey } from "@/lib/exam-utils"
import { parsePdfAnswers } from "@/lib/pdf-parser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { ArrowLeft, GraduationCap, Loader2, Wand2, Eye } from "lucide-react"
import { StepIndicator, ExamInfoForm, PdfUploader, ScheduleFields, AnswerEntry } from "./_components"
import type { Option, TFAnswer, SAAnswer } from "@/types/exam"

export default function CreateExamPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName] = useState("")

  const {
    title, setTitle,
    subject, setSubject,
    duration, setDuration,
    maxAttempts, setMaxAttempts,
    isScheduled, setIsScheduled,
    startTime, setStartTime,
    endTime, setEndTime,
    enableTF, setEnableTF,
    enableSA, setEnableSA,
    mcCount, setMcCount,
    tfCount, setTfCount,
    saCount, setSaCount,
    sendNotification, setSendNotification,
    scoreVisibilityMode, setScoreVisibilityMode,
    scoreThreshold, setScoreThreshold,
    securityLevel, setSecurityLevel,
    totalQuestions,
    assignedTo, setAssignedTo,
  } = useExamForm()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"info" | "answers">("info")
  const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc")
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [createdExamId, setCreatedExamId] = useState<string | null>(null)
  const [targetGrade, setTargetGrade] = useState<number | null>(null)
  const [targetClasses, setTargetClasses] = useState<string>("")

  const {
    correctAnswers, setCorrectAnswers,
    mcAnswers, setMcAnswers,
    tfAnswers, setTfAnswers,
    saAnswers, setSaAnswers,
  } = useAnswerForm()

  const {
    pdfFile, setPdfFile,
    pdfUrl, setPdfUrl,
    answerPdfFile, setAnswerPdfFile,
    uploadingPdf, setUploadingPdf,
    parsingPdf, setParsingPdf,
    parseSuccess, setParseSuccess,
    handlePdfUpload,
  } = usePdfUpload(supabase, setError)

  const handleMcCountChange = (newCount: number) => {
    setMcCount(newCount)
    const nextMc = Array.from({ length: newCount }, (_, i) => mcAnswers[i] || correctAnswers[i] || null)
    setMcAnswers(nextMc)
    setCorrectAnswers(nextMc)
  }

  const handleTfCountChange = (newCount: number) => {
    setTfCount(newCount)
    setEnableTF(newCount > 0)
    setTfAnswers(
      Array.from({ length: newCount }, (_, i) => {
        const baseQ = mcCount + 1 + i
        return tfAnswers[i] || { question: baseQ, a: true, b: true, c: true, d: true }
      })
    )
  }

  const handleSaCountChange = (newCount: number) => {
    setSaCount(newCount)
    setEnableSA(newCount > 0)
    setSaAnswers(
      Array.from({ length: newCount }, (_, i) => {
        const baseQ = mcCount + (newCount > 0 ? tfCount : 0) + 1 + i
        return saAnswers[i] || { question: baseQ, answer: "" }
      })
    )
  }

  const handleParsePdf = async (fileToUse?: File) => {
    const targetFile = fileToUse || answerPdfFile || pdfFile
    if (!targetFile) {
      setError("Vui lòng upload file PDF đáp án trước")
      return
    }
    setParsingPdf(true)
    setError(null)
    setParseSuccess(false)
    try {
      const data = await parsePdfAnswers(targetFile)
      const mcData = data.multiple_choice || []
      const parsedMc = mcData
        .filter((a: string) => ["A", "B", "C", "D"].includes(String(a).toUpperCase()))
        .map((a: string) => a.toUpperCase() as Option)

      if (parsedMc.length > 0) {
        setMcAnswers(parsedMc)
        setCorrectAnswers(parsedMc)
        setMcCount(parsedMc.length)
      }

      const tfData = data.true_false || []
      if (tfData.length > 0) {
        setTfAnswers(
          tfData.map((tf: any, index) => {
            const answers = tf.answers || tf;
            return {
              question: parsedMc.length + 1 + index,
              a: answers.a ?? true,
              b: answers.b ?? true,
              c: answers.c ?? true,
              d: answers.d ?? true,
            };
          })
        )
        setTfCount(tfData.length)
        setEnableTF(true)
      }

      const saData = data.short_answer || []
      if (saData.length > 0) {
        const tfLen = tfData.length
        setSaAnswers(
          saData.map((sa, index) => ({ question: parsedMc.length + tfLen + 1 + index, answer: sa.answer }))
        )
        setSaCount(saData.length)
        setEnableSA(true)
      }

      if (parsedMc.length || tfData.length || saData.length) {
        setParseSuccess(true)
      } else {
        throw new Error("Không tìm thấy đáp án trong PDF")
      }
    } catch (err) {
      setError(
        (err as Error).name === "AbortError"
          ? "Quá thời gian chờ (90s)."
          : "Lỗi parse PDF: " + (err as Error).message
      )
    } finally {
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
        ? Array.from({ length: tfCount }, (_, i) => {
            const baseQ = mcCount + 1 + i;
            const existing = tfAnswers.find((t) => t.question === baseQ) || tfAnswers[i] || {};
            return {
              question: baseQ,
              a: existing.a ?? true,
              b: existing.b ?? true,
              c: existing.c ?? true,
              d: existing.d ?? true,
            };
          })
        : []

      const finalSaAnswers = enableSA
        ? Array.from({ length: saCount }, (_, i) => {
            const baseQ = mcCount + effectiveTf + 1 + i;
            const existing = saAnswers.find((s) => s.question === baseQ) || saAnswers[i] || {};
            return {
              question: baseQ,
              answer: String(existing.answer ?? "").trim(),
            };
          })
        : []

      const classesArray = targetClasses.trim()
        ? targetClasses.split(",").map(c => c.trim().toUpperCase()).filter(Boolean)
        : null

      const { data, error: insertError } = await supabase
        .from("exams")
        .insert({
          teacher_id: user.id,
          target_grade: targetGrade,
          target_classes: classesArray,
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
          assigned_to: assignedTo,
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (data) {
        setCreatedExamId(data.id)
        setShowLinkDialog(true)
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

        <StepIndicator currentStep={step} onStepChange={setStep} />

        {step === "info" ? (
          <section className="mt-8 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <ExamInfoForm
              title={title}
              onTitleChange={setTitle}
              subject={subject}
              onSubjectChange={setSubject}
              duration={duration}
              onDurationChange={setDuration}
              maxAttempts={maxAttempts}
              onMaxAttemptsChange={setMaxAttempts}
              targetGrade={targetGrade}
              onTargetGradeChange={setTargetGrade}
              targetClasses={targetClasses}
              onTargetClassesChange={setTargetClasses}
              assignedTo={assignedTo}
              onAssignedToChange={setAssignedTo}
            />
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <PdfUploader uploadingPdf={uploadingPdf} pdfUrl={pdfUrl} onUpload={handlePdfUpload} />
              
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="block">Cấu trúc đề thi</Label>
                  <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2 py-0.5 text-[10px] font-bold">TỔNG: {totalQuestions} CÂU</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 text-center">
                    <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Trắc nghiệm</Label>
                    <Input type="number" value={mcCount} onChange={(e) => handleMcCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center text-sm" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Đúng/Sai</Label>
                    <Input type="number" value={tfCount} onChange={(e) => handleTfCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center text-sm" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Điền đáp án</Label>
                    <Input type="number" value={saCount} onChange={(e) => handleSaCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center text-sm" />
                  </div>
                </div>
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
                  {scoreVisibilityMode === "threshold" && (
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))]/60 p-3">
                      <span>Ngưỡng điểm</span>
                      <Input type="number" value={scoreThreshold} onChange={(e) => setScoreThreshold(Number(e.target.value))} className="w-24 rounded-lg" />
                    </label>
                  )}
                  <ScheduleFields
                    isScheduled={isScheduled}
                    onScheduledChange={setIsScheduled}
                    startTime={startTime}
                    onStartTimeChange={setStartTime}
                    endTime={endTime}
                    onEndTimeChange={setEndTime}
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <AnswerEntry
            mcCount={mcCount}
            tfCount={tfCount}
            saCount={saCount}
            correctAnswers={correctAnswers}
            onCorrectAnswersChange={setCorrectAnswers}
            tfAnswers={tfAnswers}
            onTfAnswersChange={setTfAnswers}
            saAnswers={saAnswers}
            onSaAnswersChange={setSaAnswers}
            enableTF={enableTF}
            enableSA={enableSA}
            answerTab={answerTab}
            onAnswerTabChange={setAnswerTab}
            totalQuestions={totalQuestions}
            answerPdfFile={answerPdfFile}
            onAnswerPdfFileChange={setAnswerPdfFile}
            parsingPdf={parsingPdf}
            parseSuccess={parseSuccess}
            onParsePdf={handleParsePdf}
            sendNotification={sendNotification}
            onSendNotificationChange={setSendNotification}
            securityLevel={securityLevel}
            onSecurityLevelChange={setSecurityLevel}
          />
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
          </Button>
          <Button type="button" onClick={() => void handleSave(false)} disabled={loading} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Eye className="mr-2 h-4 w-4" /> Lưu nháp</>}
          </Button>
          <Button type="button" onClick={() => void handleSave(true)} disabled={loading} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Lưu & phát hành</>}
          </Button>
        </div>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
