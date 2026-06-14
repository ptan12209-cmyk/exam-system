"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createShuffleSeed, shuffleWithMapping } from "@/lib/shuffle"
import { AntiCheatProvider } from "@/components/exam/AntiCheatProvider"
import { AntiCheatWarning, FullscreenPrompt } from "@/components/exam/AntiCheatUI"
import { WebcamProctor } from "@/components/exam/WebcamProctor"
import { AudioProctor } from "@/components/exam/AudioProctor"
import { InlinePdfViewer } from "@/components/exam/InlinePdfViewer"
import { StudentShell } from "@/components/student/StudentShell"
import { AlertTriangle, Clock, FileText, Send, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { useToast } from "@/components/ui/toast"

type Option = "A" | "B" | "C" | "D"
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }

interface Exam { id: string; title: string; duration: number; total_questions: number; pdf_url: string | null; mc_questions?: { question: number }[]; tf_questions?: { question: number }[]; sa_questions?: { question: number }[]; security_level?: number }
interface ExistingSession { id: string; is_ranked: boolean; session_number: number; tab_switch_count?: number; created_at?: string; started_at?: string }
const OPTIONS: Option[] = ["A", "B", "C", "D"]

export default function TakeExamPage() {
  const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = useMemo(() => createClient(), []); const isSubmittingRef = useRef(false)
  const { success, error: toastError } = useToast()
  const [exam, setExam] = useState<Exam | null>(null); const [userId, setUserId] = useState<string | null>(null); const [studentAnswers, setStudentAnswers] = useState<(Option | null)[]>([]); const [tfStudentAnswers, setTfStudentAnswers] = useState<TFStudentAnswer[]>([]); const [saStudentAnswers, setSaStudentAnswers] = useState<SAStudentAnswer[]>([]); const [timeLeft, setTimeLeft] = useState(0); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [showConfirm, setShowConfirm] = useState(false); const [examStarted, setExamStarted] = useState(false); const [antiCheatEnabled, setAntiCheatEnabled] = useState(true); const [sessionId, setSessionId] = useState<string | null>(null); const [isRanked, setIsRanked] = useState(true); const [activeTab, setActiveTab] = useState<"mc" | "tf" | "sa">("mc"); const [tabSwitchCount, setTabSwitchCount] = useState(0); const [showSessionChoice, setShowSessionChoice] = useState(false); const [existingSession, setExistingSession] = useState<ExistingSession | null>(null); const isRestoredRef = useRef(false)
  const [activeMcIndex, setActiveMcIndex] = useState(0)
  const [activeTfIndex, setActiveTfIndex] = useState(0)
  const [activeSaIndex, setActiveSaIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const localStorageKey = useMemo(() => (userId ? `exam_${examId}_${userId}_answers` : `exam_${examId}_answers`), [examId, userId])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    handleFsChange()
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  const heightClass = isFullscreen ? "h-[85vh]" : "h-[75vh]"

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push("/login")

      const response = await fetch(`/api/exams/${examId}/questions`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 403 && errorData.error === "Maximum attempts reached") {
          return router.push(`/student/exams/${examId}/result`)
        }
        router.push("/student/dashboard")
        return
      }

      const examData = await response.json()
      setExam(examData)
      setTimeLeft(examData.duration * 60)
      setUserId(user.id)
      setAntiCheatEnabled((examData.security_level ?? 1) >= 1)

      // Initialize answers and restore from localStorage first, before session checks!
      const mcCount = examData.mc_questions?.length || examData.total_questions || 12
      const defaultTf = examData.tf_questions?.map((item: { question: number }) => ({ question: item.question, a: null, b: null, c: null, d: null })) || []
      const defaultSa = examData.sa_questions?.map((item: { question: number }) => ({ question: item.question, answer: "" })) || []

      const defaultMc = shuffleWithMapping(Array.from({ length: mcCount }, (_, index) => index), createShuffleSeed(examId, user.id)).shuffled.map(() => null)
      setStudentAnswers(defaultMc)
      setTfStudentAnswers(defaultTf)
      setSaStudentAnswers(defaultSa)

      // Use the correct key with user.id, since we are logged in
      const userAnswersKey = `exam_${examId}_${user.id}_answers`
      const saved = localStorage.getItem(userAnswersKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.mc) setStudentAnswers(parsed.mc)
          if (parsed.tf) setTfStudentAnswers(parsed.tf)
          if (parsed.sa) setSaStudentAnswers(parsed.sa)
        } catch (e) {
          console.error("Lỗi khôi phục đáp án từ localStorage:", e)
          localStorage.removeItem(userAnswersKey)
        }
      }
      isRestoredRef.current = true

      // Now query the existing in-progress session
      const { data: sessionData } = await supabase
        .from("exam_sessions")
        .select("id, is_ranked, session_number, tab_switch_count, created_at, started_at")
        .eq("exam_id", examId)
        .eq("student_id", user.id)
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (sessionData) {
        setExistingSession({
          id: sessionData.id,
          is_ranked: sessionData.is_ranked,
          session_number: sessionData.session_number,
          tab_switch_count: sessionData.tab_switch_count,
          created_at: sessionData.created_at,
          started_at: sessionData.started_at
        })
        setTabSwitchCount(sessionData.tab_switch_count ?? 0)
        setShowSessionChoice(true)
        setLoading(false)
        return
      }

      // No existing session, create a new one
      const { count } = await supabase
        .from("exam_sessions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", examId)
        .eq("student_id", user.id)

      const sessionCount = count ?? 0
      setIsRanked(sessionCount === 0)

      const { data: newSession } = await supabase
        .from("exam_sessions")
        .insert({
          exam_id: examId,
          student_id: user.id,
          session_number: sessionCount + 1,
          is_ranked: sessionCount === 0,
          status: "in_progress"
        })
        .select()
        .single()

      if (newSession) {
        setSessionId(newSession.id)
        await supabase
          .from("exam_participants")
          .upsert({
            exam_id: examId,
            user_id: user.id,
            status: "active",
            last_active: new Date().toISOString()
          }, {
            onConflict: "exam_id,user_id"
          })
      }
      setLoading(false)
    })()
  }, [examId, localStorageKey, router, supabase])

  const handleSubmit = useCallback(async (autoSubmit = false) => { if (submitting || !exam) return; setSubmitting(true); try { const timeSpent = Math.max(1, Math.floor((exam.duration * 60) - timeLeft)); const response = await fetch("/api/exams/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: examId, mc_answers: studentAnswers, tf_answers: tfStudentAnswers, sa_answers: saStudentAnswers, session_id: sessionId, time_spent: timeSpent, cheat_flags: { tab_switches: tabSwitchCount, auto_submit: autoSubmit } }) }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Submission failed"); localStorage.removeItem(localStorageKey); router.push(`/student/exams/${examId}/result`) } catch (error) { toastError("Lỗi nộp bài: " + (error instanceof Error ? error.message : "Unknown error")); setSubmitting(false) } }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, sessionId, tabSwitchCount, submitting, localStorageKey, router, timeLeft])
  useEffect(() => { if (timeLeft <= 0 || loading) return; const timer = setInterval(() => setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timer); if (!isSubmittingRef.current) { isSubmittingRef.current = true; handleSubmit(true) } return 0 } return prev - 1 }), 1000); return () => clearInterval(timer) }, [timeLeft, loading, handleSubmit])
  useEffect(() => { if (isRestoredRef.current && (studentAnswers.length || tfStudentAnswers.length || saStudentAnswers.length)) localStorage.setItem(localStorageKey, JSON.stringify({ mc: studentAnswers, tf: tfStudentAnswers, sa: saStudentAnswers })) }, [studentAnswers, tfStudentAnswers, saStudentAnswers, localStorageKey])
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(async () => {
      await supabase.from("exam_sessions").update({
        answers_snapshot: { mc: studentAnswers, tf: tfStudentAnswers, sa: saStudentAnswers },
        last_active_at: new Date().toISOString(),
        tab_switch_count: tabSwitchCount
      }).eq("id", sessionId)

      if (userId) {
        await supabase.from("exam_participants").upsert({
          exam_id: examId,
          user_id: userId,
          status: "active",
          last_active: new Date().toISOString()
        }, {
          onConflict: "exam_id,user_id"
        })
      }
    }, 30000);
    return () => clearInterval(timer)
  }, [sessionId, studentAnswers, tfStudentAnswers, saStudentAnswers, tabSwitchCount, supabase, userId, examId])
  const handleViolation = useCallback((type: string, count: number) => { setTabSwitchCount(count); if (count >= 5 && isRanked) { setIsRanked(false); if (sessionId) supabase.from("exam_sessions").update({ is_ranked: false, tab_switch_count: count }).eq("id", sessionId) } fetch("/api/exams/violation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: examId, session_id: sessionId, action: type, details: { count, timestamp: new Date().toISOString() } }) }).catch(() => {}) }, [examId, isRanked, sessionId, supabase])
  const handleContinueSession = async () => {
    if (!existingSession || !exam) return
    setSessionId(existingSession.id)
    setIsRanked(existingSession.is_ranked)

    const sessionStart = new Date(existingSession.started_at || existingSession.created_at || new Date()).getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - sessionStart) / 1000)
    const durationSeconds = exam.duration * 60
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds)
    setTimeLeft(remainingSeconds)

    if (userId) {
      await supabase
        .from("exam_participants")
        .upsert({
          exam_id: examId,
          user_id: userId,
          status: "active",
          last_active: new Date().toISOString()
        }, {
          onConflict: "exam_id,user_id"
        })
    }

    setShowSessionChoice(false)
  }
  const handleRestartSession = async () => {
    if (!existingSession || !userId || !exam) return
    await supabase.from("exam_sessions").update({ status: "abandoned", is_ranked: false }).eq("id", existingSession.id)
    const { data: newSession } = await supabase.from("exam_sessions").insert({ exam_id: examId, student_id: userId, session_number: existingSession.session_number + 1, is_ranked: false, status: "in_progress" }).select().single()
    if (newSession) setSessionId(newSession.id)
    
    await supabase
      .from("exam_participants")
      .upsert({
        exam_id: examId,
        user_id: userId,
        status: "active",
        last_active: new Date().toISOString()
      }, {
        onConflict: "exam_id,user_id"
      })

    const mcCount = exam.mc_questions?.length || exam.total_questions || 12
    const defaultTf = exam.tf_questions?.map((item: { question: number }) => ({ question: item.question, a: null, b: null, c: null, d: null })) || []
    const defaultSa = exam.sa_questions?.map((item: { question: number }) => ({ question: item.question, answer: "" })) || []
    const defaultMc = shuffleWithMapping(Array.from({ length: mcCount }, (_, index) => index), createShuffleSeed(examId, userId)).shuffled.map(() => null)
    
    setStudentAnswers(defaultMc)
    setTfStudentAnswers(defaultTf)
    setSaStudentAnswers(defaultSa)
    setTimeLeft(exam.duration * 60)
    
    localStorage.removeItem(localStorageKey)
    setShowSessionChoice(false)
  }
  const answeredCount = studentAnswers.filter(Boolean).length + tfStudentAnswers.filter((item) => item.a !== null || item.b !== null || item.c !== null || item.d !== null).length + saStudentAnswers.filter((item) => item.answer.trim()).length
  if (loading) return <Loading fullPage label="Đang tải đề thi..." />
  if (!exam) return null
  if (showSessionChoice && existingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/80 p-6 text-center backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">Có phiên làm bài đang mở</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Bạn có thể tiếp tục phiên trước hoặc bắt đầu lại từ đầu.</p>
          <div className="mt-6 space-y-3">
            <Button onClick={handleContinueSession} className="w-full rounded-full">Tiếp tục</Button>
            <Button onClick={handleRestartSession} variant="outline" className="w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent">Làm lại</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AntiCheatProvider enabled={antiCheatEnabled} onMaxViolations={() => handleSubmit(true)} onViolation={handleViolation} examId={examId} initialViolations={tabSwitchCount}>
      {!examStarted && antiCheatEnabled && <FullscreenPrompt onStart={() => setExamStarted(true)} />}
      {examStarted && <AntiCheatWarning />}
      {examStarted && (exam.security_level ?? 1) >= 2 && <WebcamProctor enabled enableFaceDetection={(exam.security_level ?? 1) >= 4} onViolation={() => handleViolation("webcam_violation", tabSwitchCount + 1)} />}
      {examStarted && (exam.security_level ?? 1) >= 3 && <AudioProctor enabled onViolation={() => handleViolation("audio_violation", tabSwitchCount + 1)} />}
      <StudentShell>
        <div className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/student/exams" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 backdrop-blur-md">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Làm bài</p>
                <h1 className="max-w-[220px] truncate text-base font-semibold md:max-w-md">{exam.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn("rounded-full border px-4 py-2 font-mono text-sm font-semibold backdrop-blur-md", timeLeft <= 60 ? "border-red-500/20 text-red-500 bg-red-500/5" : "border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70") }>
                <Clock className="mr-2 inline-block h-4 w-4" />{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
              </div>
              <Button onClick={() => setShowConfirm(true)} disabled={submitting} className="rounded-full"> <Send className="mr-2 h-4 w-4" />Nộp bài</Button>
            </div>
          </div>
        </div>

        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-4 pb-28 lg:grid-cols-12 lg:px-8">
          {/* CỘT 1: ĐỀ THI PDF (CHIẾM 9/12 CỘT ~ 75% CHIỀU RỘNG ĐỂ NHÌN RÕ RÀNG TRÁNH MỎI MẮT) */}
          <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] lg:col-span-9 shadow-sm">
            {exam.pdf_url ? <InlinePdfViewer url={exam.pdf_url} className={heightClass} /> : <div className={cn("flex items-center justify-center text-center text-[hsl(var(--muted-foreground))]", heightClass)}><div><FileText className="mx-auto mb-3 h-10 w-10" /><p>Không có file đề thi</p></div></div>}
          </section>

          {/* CỘT 2: KHU VỰC TRẢ LỜI ĐÁP ÁN (CHIẾM 3/12 CỘT) */}
          <section className={cn("overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] lg:col-span-3 flex flex-col", heightClass)}>
            <div className="border-b border-[hsl(var(--border))]/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Phiếu trả lời</h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã làm {answeredCount}/{exam.total_questions} câu</p>
                </div>
                <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-[hsl(var(--muted))]/40">
                    <div className="h-full rounded-full bg-[hsl(var(--foreground))]" style={{ width: `${Math.min(100, (answeredCount / exam.total_questions) * 100)}%` }} />
                  </div>
                  <div className="mt-2">Tiến độ</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 p-1 backdrop-blur-md">
                <button onClick={() => setActiveTab("mc")} className={cn("flex-1 rounded-full px-3 py-2 text-sm transition-[background-color,color] duration-200", activeTab === "mc" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]")}>Trắc nghiệm</button>
                {!!exam.tf_questions?.length && <button onClick={() => setActiveTab("tf")} className={cn("flex-1 rounded-full px-3 py-2 text-sm transition-[background-color,color] duration-200", activeTab === "tf" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]")}>Đúng/Sai</button>}
                {!!exam.sa_questions?.length && <button onClick={() => setActiveTab("sa")} className={cn("flex-1 rounded-full px-3 py-2 text-sm transition-[background-color,color] duration-200", activeTab === "sa" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]")}>Tự luận</button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
              {activeTab === "mc" && (
                <div className="flex flex-col flex-1">
                  {/* BẢNG ĐÁP ÁN RÚT GỌN (COMPACT GRID) */}
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {Array.from({ length: exam.mc_questions?.length || exam.total_questions }, (_, i) => {
                      const isAnswered = studentAnswers[i] !== null;
                      const isActive = activeMcIndex === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveMcIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-semibold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))] ring-2 ring-[hsl(var(--foreground))]/20 scale-105"
                              : isAnswered
                              ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30 text-[hsl(var(--foreground))]"
                              : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40"
                          )}
                        >
                          <span>{i + 1}</span>
                          {isAnswered && <span className="text-[10px] font-bold text-[hsl(var(--foreground))]/80">{studentAnswers[i]}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* KHUNG TRẢ LỜI CHI TIẾT CỦA CÂU HỎI ĐANG CHỌN */}
                  <div className="mt-5 rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-3 mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Chọn đáp án</span>
                        <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--foreground))]">Câu {activeMcIndex + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto my-auto py-2">
                        {OPTIONS.map((option) => {
                          const isSelected = studentAnswers[activeMcIndex] === option;
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                setStudentAnswers((prev) => {
                                  const next = [...prev];
                                  next[activeMcIndex] = option;
                                  return next;
                                });
                                // Tự động nhảy sang câu tiếp theo sau 200ms để trải nghiệm mượt mà
                                if (activeMcIndex < (exam.mc_questions?.length || exam.total_questions) - 1) {
                                  setTimeout(() => {
                                    setActiveMcIndex((prev) => prev + 1);
                                  }, 200);
                                }
                              }}
                              className={cn(
                                "h-12 rounded-xl border text-base font-bold flex items-center justify-center transition-all duration-200 active:scale-95",
                                isSelected
                                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))] scale-105 shadow-md shadow-[hsl(var(--foreground))]/5"
                                  : "border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--foreground))]/40 hover:bg-[hsl(var(--muted))]/10"
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 border-t border-[hsl(var(--border))]/30 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeMcIndex === 0}
                        onClick={() => setActiveMcIndex((prev) => prev - 1)}
                        className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Câu trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeMcIndex === (exam.mc_questions?.length || exam.total_questions) - 1}
                        onClick={() => setActiveMcIndex((prev) => prev + 1)}
                        className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                      >
                        Câu sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tf" && !!exam.tf_questions?.length && (
                <div className="flex flex-col flex-1">
                  {/* BẢNG ĐÁP ÁN ĐÚNG/SAI RÚT GỌN */}
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {exam.tf_questions.map((tf, i) => {
                      const current = tfStudentAnswers.find((item) => item.question === tf.question) || { question: tf.question, a: null, b: null, c: null, d: null };
                      const isAnswered = current.a !== null || current.b !== null || current.c !== null || current.d !== null;
                      const isActive = activeTfIndex === i;
                      const answeredSubCount = [current.a, current.b, current.c, current.d].filter(val => val !== null).length;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveTfIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-semibold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))] ring-2 ring-[hsl(var(--foreground))]/20 scale-105"
                              : isAnswered
                              ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30 text-[hsl(var(--foreground))]"
                              : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40"
                          )}
                        >
                          <span>{tf.question}</span>
                          {isAnswered && <span className="text-[9px] font-bold text-[hsl(var(--foreground))]/60">{answeredSubCount}/4 ý</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* KHUNG ĐIỀN ĐÁP ÁN ĐÚNG/SAI CHI TIẾT */}
                  {(() => {
                    const tf = exam.tf_questions[activeTfIndex];
                    if (!tf) return null;
                    const current = tfStudentAnswers.find((item) => item.question === tf.question) || { question: tf.question, a: null, b: null, c: null, d: null };
                    return (
                      <div className="mt-5 rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-3 mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Chọn Đúng/Sai</span>
                            <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--foreground))]">Câu {tf.question}</span>
                          </div>

                          <div className="space-y-2.5">
                            {(["a", "b", "c", "d"] as const).map((sub) => (
                              <div key={sub} className="flex items-center justify-between gap-4 p-2 rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--card))]/50">
                                <span className="text-sm font-bold uppercase text-[hsl(var(--muted-foreground))] w-6 text-center">Ý {sub}</span>
                                <div className="flex gap-2 flex-1 max-w-[160px]">
                                  <button
                                    onClick={() => setTfStudentAnswers((prev) => {
                                      const next = [...prev];
                                      const idx = next.findIndex((item) => item.question === tf.question);
                                      const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: true };
                                      if (idx >= 0) next[idx] = updated; else next.push(updated);
                                      return next;
                                    })}
                                    className={cn(
                                      "flex-1 rounded-lg border py-1 text-xs font-semibold transition-all duration-200",
                                      current[sub] === true
                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10 scale-105"
                                        : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10"
                                    )}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    onClick={() => setTfStudentAnswers((prev) => {
                                      const next = [...prev];
                                      const idx = next.findIndex((item) => item.question === tf.question);
                                      const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: false };
                                      if (idx >= 0) next[idx] = updated; else next.push(updated);
                                      return next;
                                    })}
                                    className={cn(
                                      "flex-1 rounded-lg border py-1 text-xs font-semibold transition-all duration-200",
                                      current[sub] === false
                                        ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/10 scale-105"
                                        : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10"
                                    )}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 border-t border-[hsl(var(--border))]/30 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeTfIndex === 0}
                            onClick={() => setActiveTfIndex((prev) => prev - 1)}
                            className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                          >
                            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Câu trước
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeTfIndex === exam.tf_questions.length - 1}
                            onClick={() => setActiveTfIndex((prev) => prev + 1)}
                            className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                          >
                            Câu sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "sa" && !!exam.sa_questions?.length && (
                <div className="flex flex-col flex-1">
                  {/* BẢNG ĐÁP ÁN TỰ LUẬN RÚT GỌN */}
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {exam.sa_questions.map((sa, i) => {
                      const current = saStudentAnswers.find((item) => item.question === sa.question);
                      const isAnswered = !!current?.answer.trim();
                      const isActive = activeSaIndex === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveSaIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-semibold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))] ring-2 ring-[hsl(var(--foreground))]/20 scale-105"
                              : isAnswered
                              ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30 text-[hsl(var(--foreground))]"
                              : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40"
                          )}
                        >
                          <span>{sa.question}</span>
                          {isAnswered && <span className="text-[9px] font-bold text-[hsl(var(--foreground))]/60 truncate max-w-[32px] px-0.5">{current?.answer}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* KHUNG ĐIỀN ĐÁP ÁN TỰ LUẬN CHI TIẾT */}
                  {(() => {
                    const sa = exam.sa_questions[activeSaIndex];
                    if (!sa) return null;
                    const current = saStudentAnswers.find((item) => item.question === sa.question);
                    return (
                      <div className="mt-5 rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/30 pb-3 mb-4">
                            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Nhập đáp án ngắn</span>
                            <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--foreground))]">Câu {sa.question}</span>
                          </div>

                          <div className="space-y-4 py-2">
                            <input
                              type="text"
                              value={current?.answer || ""}
                              onChange={(e) => setSaStudentAnswers((prev) => {
                                const next = [...prev];
                                const idx = next.findIndex((item) => item.question === sa.question);
                                const updated = { question: sa.question, answer: e.target.value };
                                if (idx >= 0) next[idx] = updated; else next.push(updated);
                                return next;
                              })}
                              placeholder="Nhập câu trả lời..."
                              className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-4 py-3 text-base font-semibold outline-none focus:border-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--foreground))]/10 transition-all duration-200 text-center"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 border-t border-[hsl(var(--border))]/30 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeSaIndex === 0}
                            onClick={() => setActiveSaIndex((prev) => prev - 1)}
                            className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                          >
                            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Câu trước
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeSaIndex === exam.sa_questions.length - 1}
                            onClick={() => setActiveSaIndex((prev) => prev + 1)}
                            className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] h-9 text-xs"
                          >
                            Câu sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>
        </main>

        <div className="fixed bottom-6 right-6 z-50 md:hidden"><Button onClick={() => setShowConfirm(true)} size="icon" className="h-14 w-14 rounded-full"><Send className="h-5 w-5" /></Button></div>
        {showConfirm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))]/60"><FileText className="h-8 w-8" /></div><h3 className="text-xl font-semibold">Nộp bài?</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Bạn đã làm {answeredCount}/{exam.total_questions} câu.</p><div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setShowConfirm(false)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">Làm tiếp</Button><Button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-full">{submitting ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : null}Nộp bài</Button></div></div></div>}
      </StudentShell>
    </AntiCheatProvider>
  )
}
