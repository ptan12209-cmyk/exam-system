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
import { AlertTriangle, Clock, FileText, Send, ArrowLeft, CheckCircle } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"

type Option = "A" | "B" | "C" | "D"
type TFStudentAnswer = { question: number; a: boolean | null; b: boolean | null; c: boolean | null; d: boolean | null }
type SAStudentAnswer = { question: number; answer: string }

interface Exam { id: string; title: string; duration: number; total_questions: number; pdf_url: string | null; mc_questions?: { question: number }[]; tf_questions?: { question: number }[]; sa_questions?: { question: number }[]; security_level?: number }
const OPTIONS: Option[] = ["A", "B", "C", "D"]

export default function TakeExamPage() {
  const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = useMemo(() => createClient(), []); const isSubmittingRef = useRef(false)
  const [exam, setExam] = useState<Exam | null>(null); const [userId, setUserId] = useState<string | null>(null); const [studentAnswers, setStudentAnswers] = useState<(Option | null)[]>([]); const [tfStudentAnswers, setTfStudentAnswers] = useState<TFStudentAnswer[]>([]); const [saStudentAnswers, setSaStudentAnswers] = useState<SAStudentAnswer[]>([]); const [timeLeft, setTimeLeft] = useState(0); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [showConfirm, setShowConfirm] = useState(false); const [examStarted, setExamStarted] = useState(false); const [antiCheatEnabled, setAntiCheatEnabled] = useState(true); const [sessionId, setSessionId] = useState<string | null>(null); const [isRanked, setIsRanked] = useState(true); const [activeTab, setActiveTab] = useState<"mc" | "tf" | "sa">("mc"); const [tabSwitchCount, setTabSwitchCount] = useState(0); const [showSessionChoice, setShowSessionChoice] = useState(false); const [existingSession, setExistingSession] = useState<{ id: string; is_ranked: boolean; session_number: number } | null>(null); const isRestoredRef = useRef(false)
  const localStorageKey = useMemo(() => (userId ? `exam_${examId}_${userId}_answers` : `exam_${examId}_answers`), [examId, userId])

  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) return router.push("/login"); const response = await fetch(`/api/exams/${examId}/questions`); if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 403 && errorData.error === "Maximum attempts reached") return router.push(`/student/exams/${examId}/result`); router.push("/student/dashboard"); return } const examData = await response.json(); setExam(examData); setTimeLeft(examData.duration * 60); setUserId(user.id); setAntiCheatEnabled((examData.security_level ?? 1) >= 1); const { data: sessionData } = await supabase.from("exam_sessions").select("id, is_ranked, session_number").eq("exam_id", examId).eq("student_id", user.id).eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).single(); if (sessionData) { setExistingSession(sessionData); setShowSessionChoice(true); setLoading(false); return } const { count } = await supabase.from("exam_sessions").select("*", { count: "exact", head: true }).eq("exam_id", examId).eq("student_id", user.id); const sessionCount = count ?? 0; setIsRanked(sessionCount === 0); const { data: newSession } = await supabase.from("exam_sessions").insert({ exam_id: examId, student_id: user.id, session_number: sessionCount + 1, is_ranked: sessionCount === 0, status: "in_progress" }).select().single(); if (newSession) setSessionId(newSession.id); const mcCount = examData.mc_questions?.length || examData.total_questions || 12; const defaultTf = examData.tf_questions?.map((item: { question: number }) => ({ question: item.question, a: null, b: null, c: null, d: null })) || []; const defaultSa = examData.sa_questions?.map((item: { question: number }) => ({ question: item.question, answer: "" })) || []; setStudentAnswers(shuffleWithMapping(Array.from({ length: mcCount }, (_, index) => index), createShuffleSeed(examId, user.id)).shuffled.map(() => null)); setTfStudentAnswers(defaultTf); setSaStudentAnswers(defaultSa); const saved = localStorage.getItem(localStorageKey); if (saved) { try { const parsed = JSON.parse(saved); if (parsed.mc) setStudentAnswers(parsed.mc); if (parsed.tf) setTfStudentAnswers(parsed.tf); if (parsed.sa) setSaStudentAnswers(parsed.sa) } catch (e) { console.error("Lỗi khôi phục đáp án từ localStorage:", e); localStorage.removeItem(localStorageKey); } } isRestoredRef.current = true; setLoading(false) })() }, [examId, localStorageKey, router, supabase])

  const handleSubmit = useCallback(async (autoSubmit = false) => { if (submitting || !exam) return; setSubmitting(true); try { const timeSpent = Math.max(1, Math.floor((exam.duration * 60) - timeLeft)); const response = await fetch("/api/exams/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: examId, mc_answers: studentAnswers, tf_answers: tfStudentAnswers, sa_answers: saStudentAnswers, session_id: sessionId, time_spent: timeSpent, cheat_flags: { tab_switches: tabSwitchCount, auto_submit: autoSubmit } }) }); if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Submission failed"); localStorage.removeItem(localStorageKey); router.push(`/student/exams/${examId}/result`) } catch (error) { alert("Lỗi nộp bài: " + (error instanceof Error ? error.message : "Unknown error")); setSubmitting(false) } }, [exam, examId, studentAnswers, tfStudentAnswers, saStudentAnswers, sessionId, tabSwitchCount, submitting, localStorageKey, router, timeLeft])
  useEffect(() => { if (timeLeft <= 0 || loading) return; const timer = setInterval(() => setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timer); if (!isSubmittingRef.current) { isSubmittingRef.current = true; handleSubmit(true) } return 0 } return prev - 1 }), 1000); return () => clearInterval(timer) }, [timeLeft, loading, handleSubmit])
  useEffect(() => { if (isRestoredRef.current && (studentAnswers.length || tfStudentAnswers.length || saStudentAnswers.length)) localStorage.setItem(localStorageKey, JSON.stringify({ mc: studentAnswers, tf: tfStudentAnswers, sa: saStudentAnswers })) }, [studentAnswers, tfStudentAnswers, saStudentAnswers, localStorageKey])
  useEffect(() => { if (!sessionId) return; const timer = setInterval(async () => { await supabase.from("exam_sessions").update({ answers_snapshot: { mc: studentAnswers, tf: tfStudentAnswers, sa: saStudentAnswers }, last_active_at: new Date().toISOString(), tab_switch_count: tabSwitchCount }).eq("id", sessionId) }, 30000); return () => clearInterval(timer) }, [sessionId, studentAnswers, tfStudentAnswers, saStudentAnswers, tabSwitchCount, supabase])
  const handleViolation = useCallback((type: string, count: number) => { setTabSwitchCount(count); if (count >= 5 && isRanked) { setIsRanked(false); if (sessionId) supabase.from("exam_sessions").update({ is_ranked: false, tab_switch_count: count }).eq("id", sessionId) } fetch("/api/exams/violation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: examId, session_id: sessionId, action: type, details: { count, timestamp: new Date().toISOString() } }) }).catch(() => {}) }, [examId, isRanked, sessionId, supabase])
  const handleContinueSession = async () => { if (!existingSession) return; setSessionId(existingSession.id); setIsRanked(existingSession.is_ranked); setShowSessionChoice(false) }
  const handleRestartSession = async () => { if (!existingSession || !userId || !exam) return; await supabase.from("exam_sessions").update({ status: "abandoned", is_ranked: false }).eq("id", existingSession.id); const { data: newSession } = await supabase.from("exam_sessions").insert({ exam_id: examId, student_id: userId, session_number: existingSession.session_number + 1, is_ranked: false, status: "in_progress" }).select().single(); if (newSession) setSessionId(newSession.id); setStudentAnswers(Array(exam.total_questions).fill(null)); setTfStudentAnswers([]); setSaStudentAnswers([]); localStorage.removeItem(localStorageKey); setShowSessionChoice(false) }
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
    <AntiCheatProvider enabled={antiCheatEnabled} onMaxViolations={() => handleSubmit(true)} onViolation={handleViolation}>
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

        <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 pb-28 lg:grid-cols-2 lg:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
            {exam.pdf_url ? <InlinePdfViewer url={exam.pdf_url} className="h-[70vh]" /> : <div className="flex h-[70vh] items-center justify-center text-center text-[hsl(var(--muted-foreground))]"><div><FileText className="mx-auto mb-3 h-10 w-10" /><p>Không có file đề thi</p></div></div>}
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
            <div className="border-b border-[hsl(var(--border))]/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Phiếu trả lời</h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Đã làm {answeredCount}/{exam.total_questions} câu</p>
                </div>
                <div className="text-right text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-[hsl(var(--muted))]/40">
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

            <div className="max-h-[calc(70vh-120px)] overflow-y-auto p-5">
              {activeTab === "mc" && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: exam.mc_questions?.length || exam.total_questions }, (_, i) => <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-3 backdrop-blur-md"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Câu {i + 1}</span>{studentAnswers[i] && <CheckCircle className="h-4 w-4 text-[hsl(var(--foreground))]" />}</div><div className="grid grid-cols-4 gap-1">{OPTIONS.map((option) => <button key={option} onClick={() => setStudentAnswers((prev) => { const next = [...prev]; next[i] = option; return next })} className={cn("rounded-lg py-2 text-sm transition-[background-color,color] duration-200", studentAnswers[i] === option ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]")}>{option}</button>)}</div></div>)}</div>}
              {activeTab === "tf" && !!exam.tf_questions?.length && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{exam.tf_questions.map((tf, i) => { const current = tfStudentAnswers.find((item) => item.question === tf.question) || { question: tf.question, a: null, b: null, c: null, d: null }; return <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4 backdrop-blur-md"><p className="mb-3 font-medium">Câu {tf.question}</p><div className="space-y-2">{(["a", "b", "c", "d"] as const).map((sub) => <div key={sub} className="flex items-center gap-2"><span className="w-4 text-xs uppercase text-[hsl(var(--muted-foreground))]">{sub}</span><div className="flex flex-1 gap-2"><button onClick={() => setTfStudentAnswers((prev) => { const next = [...prev]; const idx = next.findIndex((item) => item.question === tf.question); const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: true }; if (idx >= 0) next[idx] = updated; else next.push(updated); return next })} className={cn("flex-1 rounded-lg border py-1.5 text-xs transition-[background-color,border-color,color] duration-200", current[sub] === true ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "border-[hsl(var(--border))]/60")}>Đúng</button><button onClick={() => setTfStudentAnswers((prev) => { const next = [...prev]; const idx = next.findIndex((item) => item.question === tf.question); const updated = { ...(idx >= 0 ? next[idx] : { question: tf.question, a: null, b: null, c: null, d: null }), [sub]: false }; if (idx >= 0) next[idx] = updated; else next.push(updated); return next })} className={cn("flex-1 rounded-lg border py-1.5 text-xs transition-[background-color,border-color,color] duration-200", current[sub] === false ? "bg-red-100 text-red-700 border-red-200" : "border-[hsl(var(--border))]/60")}>Sai</button></div></div>)}</div></div>})}</div>}
              {activeTab === "sa" && !!exam.sa_questions?.length && <div className="grid gap-3 md:grid-cols-2">{exam.sa_questions.map((sa, i) => { const current = saStudentAnswers.find((item) => item.question === sa.question); return <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4 backdrop-blur-md"><p className="mb-2 font-medium">Câu {sa.question}</p><input value={current?.answer || ""} onChange={(e) => setSaStudentAnswers((prev) => { const next = [...prev]; const idx = next.findIndex((item) => item.question === sa.question); const updated = { question: sa.question, answer: e.target.value }; if (idx >= 0) next[idx] = updated; else next.push(updated); return next })} placeholder="Nhập đáp án" className="w-full rounded-2xl border border-[hsl(var(--border))]/60 bg-transparent px-4 py-3 text-sm outline-none" /></div>})}</div>}
            </div>
          </section>
        </main>

        <div className="fixed bottom-6 right-6 z-50 md:hidden"><Button onClick={() => setShowConfirm(true)} size="icon" className="h-14 w-14 rounded-full"><Send className="h-5 w-5" /></Button></div>
        {showConfirm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[hsl(var(--border))]/60"><FileText className="h-8 w-8" /></div><h3 className="text-xl font-semibold">Nộp bài?</h3><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Bạn đã làm {answeredCount}/{exam.total_questions} câu.</p><div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setShowConfirm(false)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">Làm tiếp</Button><Button onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-full">{submitting ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : null}Nộp bài</Button></div></div></div>}
      </StudentShell>
    </AntiCheatProvider>
  )
}
