"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useExamForm } from "@/hooks/useExamForm"
import { useAnswerForm } from "@/hooks/useAnswerForm"
import { useToast } from "@/components/ui/toast"
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
import { ArrowLeft, GraduationCap, Loader2, Wand2, Eye, Sparkles, X } from "lucide-react"
import { StepIndicator, ExamInfoForm, PdfUploader, ScheduleFields, AnswerEntry } from "./_components"
import type { Option, TFAnswer, SAAnswer } from "@/types/exam"
import { MAP_SUBJECT_TO_DB, MAP_DB_TO_SUBJECT } from "@/lib/subjects"

export default function CreateExamPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success } = useToast()

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
  const [isAdvanced, setIsAdvanced] = useState(false)

  // Bank import states
  const [showImportModal, setShowImportModal] = useState(false)
  const [bankExams, setBankExams] = useState<any[]>([])
  const [loadingBank, setLoadingBank] = useState(false)

  const fetchBankExams = async () => {
    setLoadingBank(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("exams")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
      if (data) setBankExams(data)
    } catch (err) {
      console.error("Error loading bank exams:", err)
    } finally {
      setLoadingBank(false)
    }
  }

  useEffect(() => {
    if (showImportModal) {
      void fetchBankExams()
    }
  }, [showImportModal])

  const handleImportFromBank = (bankExam: any) => {
    const mcCountVal = bankExam.mc_answers?.length || bankExam.correct_answers?.length || 0
    const tfCountVal = bankExam.tf_answers?.length || 0
    const saCountVal = bankExam.sa_answers?.length || 0

    setMcCount(mcCountVal)
    setTfCount(tfCountVal)
    setSaCount(saCountVal)
    setEnableTF(tfCountVal > 0)
    setEnableSA(saCountVal > 0)

    if (bankExam.mc_answers) {
      const mc = bankExam.mc_answers.map((item: any) => item.answer)
      setMcAnswers(mc)
      setCorrectAnswers(mc)
    } else if (bankExam.correct_answers) {
      setMcAnswers(bankExam.correct_answers)
      setCorrectAnswers(bankExam.correct_answers)
    }

    if (bankExam.tf_answers) {
      setTfAnswers(bankExam.tf_answers)
    }
    if (bankExam.sa_answers) {
      setSaAnswers(bankExam.sa_answers)
    }

    if (bankExam.pdf_url) {
      setPdfUrl(bankExam.pdf_url)
    }

    if (bankExam.target_grade) setTargetGrade(bankExam.target_grade)
    if (bankExam.subject) setSubject(MAP_DB_TO_SUBJECT[bankExam.subject] || bankExam.subject)

    setShowImportModal(false)
    success(`Đã nhập thành công cấu trúc đề và ${bankExam.total_questions} đáp án từ "${bankExam.title}"!`)
  }

  // Hierarchy states
  const [selectedChapterId, setSelectedChapterId] = useState<string>("")
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [selectedSectionId, setSelectedSectionId] = useState<string>("")
  const [availableChapters, setAvailableChapters] = useState<any[]>([])
  const [availableLessons, setAvailableLessons] = useState<any[]>([])
  const [availableSections, setAvailableSections] = useState<any[]>([])

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

  // Cascade: load chapters when grade+subject available
  useEffect(() => {
    if (!targetGrade || !subject) { setAvailableChapters([]); return }
    const dbSubject = MAP_SUBJECT_TO_DB[subject] || subject
    fetch(`/api/study/chapters?subject=${dbSubject}&grade=${targetGrade}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableChapters(d.data); else setAvailableChapters([]) })
      .catch(() => setAvailableChapters([]))
  }, [targetGrade, subject])

  // Cascade: load lessons when chapter changes
  useEffect(() => {
    if (!selectedChapterId) { setAvailableLessons([]); setAvailableSections([]); return }
    fetch(`/api/study/lessons?chapter_id=${selectedChapterId}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableLessons(d.data); else setAvailableLessons([]) })
      .catch(() => setAvailableLessons([]))
  }, [selectedChapterId])

  // Cascade: load sections when lesson changes
  useEffect(() => {
    if (!selectedLessonId) { setAvailableSections([]); return }
    fetch(`/api/study/sections?lesson_id=${selectedLessonId}`)
      .then(r => r.json()).then(d => { if (d.data) setAvailableSections(d.data); else setAvailableSections([]) })
      .catch(() => setAvailableSections([]))
  }, [selectedLessonId])

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
          is_advanced: isAdvanced,
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
          chapter_id: selectedChapterId || null,
          lesson_id: selectedLessonId || null,
          section_id: selectedSectionId || null,
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
              selectedChapterId={selectedChapterId}
              onChapterChange={setSelectedChapterId}
              selectedLessonId={selectedLessonId}
              onLessonChange={setSelectedLessonId}
              selectedSectionId={selectedSectionId}
              onSectionChange={setSelectedSectionId}
              availableChapters={availableChapters}
              availableLessons={availableLessons}
              availableSections={availableSections}
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
                <div className="grid gap-3.5 text-sm">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Loại bài tập</Label>
                    <select
                      value={isAdvanced ? "true" : "false"}
                      onChange={(e) => setIsAdvanced(e.target.value === "true")}
                      className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                    >
                      <option value="false">Bài tập chính</option>
                      <option value="true">Bài tập nâng trình (nâng cao)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Ẩn/hiện điểm</Label>
                    <select
                      value={scoreVisibilityMode}
                      onChange={(e) => setScoreVisibilityMode(e.target.value as typeof scoreVisibilityMode)}
                      className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                    >
                      <option value="always">Luôn hiện</option>
                      <option value="never">Luôn ẩn</option>
                      <option value="threshold">Theo ngưỡng</option>
                    </select>
                  </div>
                  {scoreVisibilityMode === "threshold" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-[hsl(var(--muted-foreground))]">Ngưỡng điểm</Label>
                      <Input
                        type="number"
                        value={scoreThreshold}
                        onChange={(e) => setScoreThreshold(Number(e.target.value))}
                        className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm"
                      />
                    </div>
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
            onImportFromBank={() => setShowImportModal(true)}
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

        {/* Import from Bank Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="text-xl font-semibold">Nhập đáp án từ Kho đề thi</h2>
                <button onClick={() => setShowImportModal(false)} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20">
                  <X className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                {loadingBank ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : bankExams.length === 0 ? (
                  <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-12">Bạn chưa có đề thi nào trong kho đề.</p>
                ) : (
                  <div className="divide-y divide-[hsl(var(--border))]/40">
                    {bankExams.map((exam) => (
                      <div key={exam.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                        <div>
                          <h4 className="font-semibold text-sm">{exam.title}</h4>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            {exam.total_questions} câu • Môn {MAP_DB_TO_SUBJECT[exam.subject] || exam.subject} • {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleImportFromBank(exam)}
                          size="sm"
                          className="rounded-full"
                        >
                          Chọn nhập
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
