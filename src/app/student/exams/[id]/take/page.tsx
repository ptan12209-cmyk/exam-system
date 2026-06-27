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
import { AlertTriangle, Clock, FileText, Send, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { useToast } from "@/components/ui/toast"

type Option = "A" | "B" | "C" | "D"
import type { Exam, TFStudentAnswer, SAStudentAnswer } from "@/types"
interface ExistingSession { id: string; is_ranked: boolean; session_number: number; tab_switch_count?: number; created_at?: string; started_at?: string }
const OPTIONS: Option[] = ["A", "B", "C", "D"]

const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function TakeExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const supabase = useMemo(() => createClient(), [])
  const isSubmittingRef = useRef(false)
  
  const { success, error: toastError } = useToast()
  const [exam, setExam] = useState<Exam | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [studentAnswers, setStudentAnswers] = useState<(Option | null)[]>([])
  const [tfStudentAnswers, setTfStudentAnswers] = useState<TFStudentAnswer[]>([])
  const [saStudentAnswers, setSaStudentAnswers] = useState<SAStudentAnswer[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [examStarted, setExamStarted] = useState(false)
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isRanked, setIsRanked] = useState(true)
  const [activeTab, setActiveTab] = useState<"mc" | "tf" | "sa">("mc")
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [showSessionChoice, setShowSessionChoice] = useState(false)
  const [existingSession, setExistingSession] = useState<ExistingSession | null>(null)
  const isRestoredRef = useRef(false)
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

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting || !exam) return
    setSubmitting(true)
    try {
      const timeSpent = Math.max(1, Math.floor((exam.duration * 60) - timeLeft))
      const response = await fetch("/api/exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          mc_answers: studentAnswers,
          tf_answers: tfStudentAnswers,
          sa_answers: saStudentAnswers,
          session_id: sessionId,
          time_spent: timeSpent,
          cheat_flags: { tab_switches: tabSwitchCount, auto_submit: autoSubmit }
        })
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Submission failed")
      localStorage.removeItem(localStorageKey)
      router.push(`/student/exams/${examId}/result`)
    } catch (error) {
      toastError("Lỗi nộp bài: " + (error instanceof Error ? error.message : "Unknown error"))
      setSubmitting(false)
    }
  }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, sessionId, tabSwitchCount, submitting, localStorageKey, router, timeLeft])

  useEffect(() => {
    if (timeLeft <= 0 || loading) return
    const timer = setInterval(() => setTimeLeft((prev) => {
      if (prev <= 1) {
        clearInterval(timer)
        if (!isSubmittingRef.current) {
          isSubmittingRef.current = true
          handleSubmit(true)
        }
        return 0
      }
      return prev - 1
    }), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, loading, handleSubmit])

  useEffect(() => {
    if (isRestoredRef.current && (studentAnswers.length || tfStudentAnswers.length || saStudentAnswers.length)) {
      localStorage.setItem(localStorageKey, JSON.stringify({ mc: studentAnswers, tf: tfStudentAnswers, sa: saStudentAnswers }))
    }
  }, [studentAnswers, tfStudentAnswers, saStudentAnswers, localStorageKey])

  useEffect(() => {
    if (!sessionId) return
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
    }, 30000)
    return () => clearInterval(timer)
  }, [sessionId, studentAnswers, tfStudentAnswers, saStudentAnswers, tabSwitchCount, supabase, userId, examId])

  const handleViolation = useCallback((type: string, count: number) => {
    setTabSwitchCount(count)
    if (count >= 5 && isRanked) {
      setIsRanked(false)
      if (sessionId) supabase.from("exam_sessions").update({ is_ranked: false, tab_switch_count: count }).eq("id", sessionId)
    }
    fetch("/api/exams/violation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exam_id: examId,
        session_id: sessionId,
        action: type,
        details: { count, timestamp: new Date().toISOString() }
      })
    }).catch(() => {})
  }, [examId, isRanked, sessionId, supabase])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải đề thi..." />
      </div>
    )
  }

  if (!exam) return null

  if (showSessionChoice && existingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0A13] p-4 text-[#F1EDF9]">
        <div className="w-full max-w-md rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#8C87A2]/30 bg-[#0B0A13]">
            <AlertTriangle className="h-7 w-7 text-[#C18CFF]" />
          </div>
          <h2 className="text-xl font-bold">Có phiên làm bài đang mở</h2>
          <p className="mt-2 text-xs text-[#8C87A2]">Bạn có thể tiếp tục phiên trước hoặc bắt đầu lại từ đầu.</p>
          <div className="mt-6 space-y-3">
            <Button onClick={handleContinueSession} className="w-full rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold py-3">Tiếp tục</Button>
            <Button onClick={handleRestartSession} variant="outline" className="w-full rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent py-3">Làm lại</Button>
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
      
      <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 border-b border-[#8C87A2]/20 bg-[#15131F]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/student/exams" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] hover:border-[#C18CFF] hover:text-[#C18CFF] transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C87A2] font-mono">Đang làm bài</p>
                <h1 className="max-w-[220px] truncate text-base font-bold md:max-w-md">{exam.title}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn("rounded-xl border px-4 py-2 font-mono text-sm font-semibold flex items-center bg-[#0B0A13]", timeLeft <= 60 ? "border-red-500/30 text-red-500 bg-red-500/10" : "border-[#8C87A2]/30 text-[#C18CFF]") }>
                <Clock className="mr-2 h-4 w-4" />
                <span>{String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}</span>
              </div>
              <Button onClick={() => setShowConfirm(true)} disabled={submitting} className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold"> 
                <Send className="mr-2 h-4 w-4" />Nộp bài
              </Button>
            </div>
          </div>
        </div>

        {/* Main Body */}
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-4 pb-28 lg:grid-cols-12 lg:px-8">
          
          {/* PDF Viewer */}
          <section className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] lg:col-span-9 shadow-sm">
            {exam.pdf_url ? (
              <InlinePdfViewer url={exam.pdf_url} className={heightClass} />
            ) : (
              <div className={cn("flex items-center justify-center text-center text-[#8C87A2]", heightClass)}>
                <div>
                  <FileText className="mx-auto mb-3 h-10 w-10 text-[#8C87A2]/20" />
                  <p className="text-xs">Không có file đề thi</p>
                </div>
              </div>
            )}
          </section>

          {/* Answers Panel */}
          <section className={cn("overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] lg:col-span-3 flex flex-col shadow-sm", heightClass)}>
            
            <div className="border-b border-[#8C87A2]/20 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-[#F1EDF9]">Phiếu trả lời</h2>
                  <p className="text-xs text-[#8C87A2] mt-0.5">Đã làm {answeredCount}/{exam.total_questions} câu</p>
                </div>
                <div className="text-right text-[10px] text-[#8C87A2] font-mono">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#0B0A13]">
                    <div className="h-full rounded-full bg-[#C18CFF]" style={{ width: `${Math.min(100, (answeredCount / exam.total_questions) * 100)}%` }} />
                  </div>
                  <div className="mt-1">Tiến độ</div>
                </div>
              </div>

              {/* Sub tabs switcher */}
              <div className="mt-4 flex gap-1 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] p-1">
                <button onClick={() => setActiveTab("mc")} className={cn("flex-1 rounded-lg py-1.5 text-xs font-bold transition-all whitespace-nowrap", activeTab === "mc" ? "bg-[#C18CFF] text-[#0B0A13]" : "text-[#8C87A2] hover:text-[#F1EDF9]")}>Trắc nghiệm</button>
                {!!exam.tf_questions?.length && <button onClick={() => setActiveTab("tf")} className={cn("flex-1 rounded-lg py-1.5 text-xs font-bold transition-all whitespace-nowrap", activeTab === "tf" ? "bg-[#C18CFF] text-[#0B0A13]" : "text-[#8C87A2] hover:text-[#F1EDF9]")}>Đúng/Sai</button>}
                {!!exam.sa_questions?.length && <button onClick={() => setActiveTab("sa")} className={cn("flex-1 rounded-lg py-1.5 text-xs font-bold transition-all whitespace-nowrap", activeTab === "sa" ? "bg-[#C18CFF] text-[#0B0A13]" : "text-[#8C87A2] hover:text-[#F1EDF9]")}>Tự luận</button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
              
              {/* Trắc nghiệm MC List */}
              {activeTab === "mc" && (
                <div className="flex flex-col flex-1">
                  {/* Compact Grid Map */}
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {Array.from({ length: exam.mc_questions?.length || exam.total_questions }, (_, i) => {
                      const isAnswered = studentAnswers[i] !== null
                      const isActive = activeMcIndex === i
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveMcIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF] scale-105"
                              : isAnswered
                              ? "bg-[#C18CFF]/15 border-[#C18CFF]/30 text-[#C18CFF]"
                              : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:border-[#C18CFF]/50"
                          )}
                        >
                          <span className="font-mono">{i + 1}</span>
                          {isAnswered && <span className="text-[10px] font-bold font-mono">{studentAnswers[i]}</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Detail Option Choices */}
                  <div className="mt-5 rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13]/40 p-5 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center justify-between border-b border-[#8C87A2]/20 pb-3 mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Chọn đáp án</span>
                        <span className="rounded-lg bg-[#C18CFF]/15 px-2.5 py-0.5 text-xs font-bold text-[#C18CFF]">Câu {activeMcIndex + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto py-2">
                        {OPTIONS.map((option) => {
                          const isSelected = studentAnswers[activeMcIndex] === option
                          return (
                            <button
                              key={option}
                              onClick={() => {
                                setStudentAnswers((prev) => {
                                  const next = [...prev]
                                  next[activeMcIndex] = option
                                  return next
                                })
                                if (activeMcIndex < (exam.mc_questions?.length || exam.total_questions) - 1) {
                                  setTimeout(() => {
                                    setActiveMcIndex((prev) => prev + 1)
                                  }, 200)
                                }
                              }}
                              className={cn(
                                "h-12 rounded-xl border text-base font-bold flex items-center justify-center transition-all active:scale-95",
                                isSelected
                                  ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF] scale-105"
                                  : "border-[#8C87A2]/30 bg-[#15131F] text-[#8C87A2] hover:border-[#C18CFF]/50 hover:text-[#F1EDF9]"
                              )}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 border-t border-[#8C87A2]/20 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeMcIndex === 0}
                        onClick={() => setActiveMcIndex((prev) => prev - 1)}
                        className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeMcIndex === (exam.mc_questions?.length || exam.total_questions) - 1}
                        onClick={() => setActiveMcIndex((prev) => prev + 1)}
                        className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                      >
                        Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Đúng/Sai TF List */}
              {activeTab === "tf" && !!exam.tf_questions?.length && (
                <div className="flex flex-col flex-1">
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {exam.tf_questions.map((tf, i) => {
                      const current = tfStudentAnswers.find((item) => item.question === tf.question) || { question: tf.question, a: null, b: null, c: null, d: null }
                      const isAnswered = current.a !== null || current.b !== null || current.c !== null || current.d !== null
                      const isActive = activeTfIndex === i
                      const answeredSubCount = [current.a, current.b, current.c, current.d].filter(val => val !== null).length
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveTfIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF] scale-105"
                              : isAnswered
                              ? "bg-[#C18CFF]/15 border-[#C18CFF]/30 text-[#C18CFF]"
                              : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:border-[#C18CFF]/50"
                          )}
                        >
                          <span className="font-mono">{tf.question}</span>
                          {isAnswered && <span className="text-[9px] font-bold font-mono text-[#C18CFF]">{answeredSubCount}/4 ý</span>}
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const tf = exam.tf_questions[activeTfIndex]
                    if (!tf) return null
                    const current = tfStudentAnswers.find((item) => item.question === tf.question) || { question: tf.question, a: null, b: null, c: null, d: null }
                    return (
                      <div className="mt-5 rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13]/40 p-5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center justify-between border-b border-[#8C87A2]/20 pb-3 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Chọn Đúng/Sai</span>
                            <span className="rounded-lg bg-[#C18CFF]/15 px-2.5 py-0.5 text-xs font-bold text-[#C18CFF]">Câu {tf.question}</span>
                          </div>

                          <div className="space-y-2.5">
                            {(["a", "b", "c", "d"] as const).map((sub) => (
                              <div key={sub} className="flex items-center justify-between gap-4 p-2 rounded-xl border border-[#8C87A2]/20 bg-[#15131F]">
                                <span className="text-xs font-bold uppercase text-[#8C87A2] w-6 text-center font-mono">Ý {sub}</span>
                                <div className="flex gap-2 flex-1 max-w-[160px]">
                                  <button
                                    onClick={() => setTfStudentAnswers((prev) => {
                                      const next = [...prev]
                                      const idx = next.findIndex((item) => item.question === tf.question)
                                      const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: true }
                                      if (idx >= 0) next[idx] = updated; else next.push(updated)
                                      return next
                                    })}
                                    className={cn(
                                      "flex-1 rounded-lg border py-1 text-xs font-bold transition-all",
                                      current[sub] === true
                                        ? "bg-emerald-500 text-white border-emerald-500 scale-105"
                                        : "border-[#8C87A2]/30 bg-transparent text-[#8C87A2] hover:bg-[#0B0A13]/40"
                                    )}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    onClick={() => setTfStudentAnswers((prev) => {
                                      const next = [...prev]
                                      const idx = next.findIndex((item) => item.question === tf.question)
                                      const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: false }
                                      if (idx >= 0) next[idx] = updated; else next.push(updated)
                                      return next
                                    })}
                                    className={cn(
                                      "flex-1 rounded-lg border py-1 text-xs font-bold transition-all",
                                      current[sub] === false
                                        ? "bg-red-500 text-white border-red-500 scale-105"
                                        : "border-[#8C87A2]/30 bg-transparent text-[#8C87A2] hover:bg-[#0B0A13]/40"
                                    )}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 border-t border-[#8C87A2]/20 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeTfIndex === 0}
                            onClick={() => setActiveTfIndex((prev) => prev - 1)}
                            className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                          >
                            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeTfIndex === exam.tf_questions.length - 1}
                            onClick={() => setActiveTfIndex((prev) => prev + 1)}
                            className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                          >
                            Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Tự luận SA List */}
              {activeTab === "sa" && !!exam.sa_questions?.length && (
                <div className="flex flex-col flex-1">
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {exam.sa_questions.map((sa, i) => {
                      const current = saStudentAnswers.find((item) => item.question === sa.question)
                      const isAnswered = !!current?.answer.trim()
                      const isActive = activeSaIndex === i
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveSaIndex(i)}
                          className={cn(
                            "h-10 w-full rounded-xl text-xs font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-0.5",
                            isActive
                              ? "bg-[#C18CFF] text-[#0B0A13] border-[#C18CFF] scale-105"
                              : isAnswered
                              ? "bg-[#C18CFF]/15 border-[#C18CFF]/30 text-[#C18CFF]"
                              : "border-[#8C87A2]/20 bg-transparent text-[#8C87A2] hover:border-[#C18CFF]/50"
                          )}
                        >
                          <span className="font-mono">{sa.question}</span>
                          {isAnswered && <span className="text-[9px] font-bold text-[#C18CFF] truncate max-w-[32px] px-0.5 font-mono">{current?.answer}</span>}
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const sa = exam.sa_questions[activeSaIndex]
                    if (!sa) return null
                    const current = saStudentAnswers.find((item) => item.question === sa.question)
                    return (
                      <div className="mt-5 rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13]/40 p-5 flex flex-col justify-between flex-1">
                        <div>
                          <div className="flex items-center justify-between border-b border-[#8C87A2]/20 pb-3 mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">Nhập đáp án ngắn</span>
                            <span className="rounded-lg bg-[#C18CFF]/15 px-2.5 py-0.5 text-xs font-bold text-[#C18CFF]">Câu {sa.question}</span>
                          </div>

                          <div className="space-y-4 py-2">
                            <input
                              type="text"
                              value={current?.answer || ""}
                              onChange={(e) => setSaStudentAnswers((prev) => {
                                const next = [...prev]
                                const idx = next.findIndex((item) => item.question === sa.question)
                                const updated = { question: sa.question, answer: e.target.value }
                                if (idx >= 0) next[idx] = updated; else next.push(updated)
                                return next
                              })}
                              placeholder="Nhập câu trả lời..."
                              className="w-full rounded-xl border border-[#8C87A2]/40 bg-[#15131F] px-4 py-3 text-base font-bold outline-none focus:border-[#C18CFF] transition-all text-center text-[#F1EDF9]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 border-t border-[#8C87A2]/20 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeSaIndex === 0}
                            onClick={() => setActiveSaIndex((prev) => prev - 1)}
                            className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                          >
                            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Trước
                      </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={activeSaIndex === exam.sa_questions.length - 1}
                            onClick={() => setActiveSaIndex((prev) => prev + 1)}
                            className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] h-9 text-xs"
                          >
                            Sau <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </section>
        </main>

        <div className="fixed bottom-6 right-6 z-50 md:hidden">
          <Button onClick={() => setShowConfirm(true)} size="icon" className="h-14 w-14 rounded-full bg-[#C18CFF] text-[#0B0A13]">
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 text-center shadow-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#8C87A2]/30 bg-[#0B0A13]">
                <FileText className="h-8 w-8 text-[#C18CFF]" />
              </div>
              <h3 className="text-xl font-bold">Nộp bài?</h3>
              <p className="mt-2 text-xs text-[#8C87A2]">Bạn đã làm {answeredCount}/{exam.total_questions} câu.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)} className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9]">Làm tiếp</Button>
                <Button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold">
                  {submitting ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : null}Nộp bài
                </Button>
              </div>
            </div>
          </div>
        )}
      </StudentShell>
    </AntiCheatProvider>
  )
}
