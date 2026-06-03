"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, CheckCircle2, RefreshCw, AlertCircle, Shield, ShieldCheck, ShieldAlert, Camera, Mic, GraduationCap } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { cn } from "@/lib/utils"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"

const OPTIONS = ["A", "B", "C", "D"] as const

type Option = typeof OPTIONS[number]
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

export default function EditExamPage() {
  const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = createClient()
  const [loading, setLoading] = useState(true); const [authError, setAuthError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [regrading, setRegrading] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null); const [profile, setProfile] = useState<{ full_name: string | null } | null>(null)
  const [title, setTitle] = useState(""); const [duration, setDuration] = useState(15); const [mcCount, setMcCount] = useState(12); const [tfCount, setTfCount] = useState(4); const [saCount, setSaCount] = useState(6); const [mcAnswers, setMcAnswers] = useState<(Option | null)[]>([]); const [tfAnswers, setTfAnswers] = useState<TFAnswer[]>([]); const [saAnswers, setSaAnswers] = useState<SAAnswer[]>([]); const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc"); const [securityLevel, setSecurityLevel] = useState(1)
  const [targetGrade, setTargetGrade] = useState<number | null>(null);
  const [targetClasses, setTargetClasses] = useState<string>("");

  useEffect(() => { (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.push("/login"); return } const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", user.id).single(); setProfile(profileData); const { data: exam } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single(); if (!exam) { const { data: anyExam } = await supabase.from("exams").select("teacher_id, title").eq("id", examId).single(); if (anyExam) setAuthError("Bạn không có quyền chỉnh sửa đề thi này. Đề thi thuộc về giáo viên khác."); else router.push("/teacher/dashboard"); setLoading(false); return } setTitle(exam.title); setDuration(exam.duration); setTargetGrade(exam.target_grade ?? null); setTargetClasses(exam.target_classes ? exam.target_classes.join(", ") : ""); if (exam.mc_answers?.length > 0) { const mc = exam.mc_answers as { question: number; answer: Option }[]; setMcCount(mc.length); const newMc: (Option | null)[] = Array(mc.length).fill(null); mc.forEach((item) => { const idx = item.question - 1; if (idx >= 0 && idx < mc.length) newMc[idx] = item.answer }); setMcAnswers(newMc) } else if (exam.correct_answers) { setMcCount(exam.correct_answers.length); setMcAnswers(exam.correct_answers) } setTfCount(exam.tf_answers?.length || 0); setTfAnswers(exam.tf_answers || []); setSaCount(exam.sa_answers?.length || 0); setSaAnswers(exam.sa_answers || []); setSecurityLevel(exam.security_level ?? 1); setLoading(false) })() }, [examId, router, supabase])
  const handleMcCountChange = (newCount: number) => { setMcCount(newCount); setMcAnswers(Array.from({ length: newCount }, (_, i) => mcAnswers[i] || null)) }
  const handleTfCountChange = (newCount: number) => { setTfCount(newCount); setTfAnswers(Array.from({ length: newCount }, (_, i) => tfAnswers[i] || { question: mcCount + 1 + i, a: true, b: true, c: true, d: true })) }
  const handleSaCountChange = (newCount: number) => { setSaCount(newCount); setSaAnswers(Array.from({ length: newCount }, (_, i) => saAnswers[i] || { question: mcCount + tfCount + 1 + i, answer: "" })) }
  const handleSave = async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tên đề thi")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const mcAnswerObjects = mcAnswers
        .map((ans, i) => ({ question: i + 1, answer: ans }))
        .filter((a) => a.answer !== null)

      const finalTfAnswers = tfCount > 0
        ? Array.from({ length: tfCount }, (_, i) => {
            const qNum = mcCount + 1 + i
            const existing = tfAnswers.find((t) => t.question === qNum) || tfAnswers[i] || {}
            return {
              question: qNum,
              a: existing.a ?? true,
              b: existing.b ?? true,
              c: existing.c ?? true,
              d: existing.d ?? true,
            }
          })
        : []

      const finalSaAnswers = saCount > 0
        ? Array.from({ length: saCount }, (_, i) => {
            const qNum = mcCount + tfCount + 1 + i
            const existing = saAnswers.find((s) => s.question === qNum) || saAnswers[i] || {}
            return {
              question: qNum,
              answer: String(existing.answer ?? "").trim(),
            }
          })
        : []

      const { error: updateError } = await supabase
        .from("exams")
        .update({
          title: title.trim(),
          duration,
          total_questions: mcCount + tfCount + saCount,
          correct_answers: mcAnswers,
          mc_answers: mcAnswerObjects,
          tf_answers: tfCount > 0 ? finalTfAnswers : [],
          sa_answers: saCount > 0 ? finalSaAnswers : [],
          security_level: securityLevel,
          target_grade: targetGrade,
          target_classes: targetClasses.trim() ? targetClasses.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) : null,
        })
        .eq("id", examId)

      if (updateError) throw updateError
      router.push("/teacher/dashboard")
    } catch (err) {
      setError("Lỗi cập nhật: " + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }
  const handleRegrade = async () => { if (!confirm("Chấm lại điểm tất cả bài nộp? Hành động này sẽ tính lại điểm dựa trên đáp án hiện tại.")) return; setRegrading(true); setError(null); setSuccess(null); try { const mcAnswerObjects = mcAnswers.map((ans, i) => ({ question: i + 1, answer: ans })).filter((a) => a.answer !== null); const finalTfAnswers = tfAnswers.map((tf, i) => ({ ...tf, question: mcCount + 1 + i })); const finalSaAnswers = saAnswers.map((sa, i) => ({ ...sa, question: mcCount + tfCount + 1 + i })); await supabase.from("exams").update({ correct_answers: mcAnswers, mc_answers: mcAnswerObjects, tf_answers: tfCount > 0 ? finalTfAnswers : [], sa_answers: saCount > 0 ? finalSaAnswers : [] }).eq("id", examId); const { data: submissions } = await supabase.from("submissions").select("id, answers, tf_answers, sa_answers").eq("exam_id", examId); if (!submissions?.length) { setSuccess("Không có bài nộp nào để chấm lại."); setRegrading(false); return } let updatedCount = 0; for (const sub of submissions) { let correctCount = 0; const totalQuestions = mcCount + tfCount + saCount; if (sub.answers && mcAnswers.length > 0) { const studentMc = sub.answers as string[]; for (let i = 0; i < mcAnswers.length; i++) if (mcAnswers[i] && studentMc[i]?.toUpperCase() === mcAnswers[i]) correctCount++ } if (sub.tf_answers && finalTfAnswers.length > 0) {
        const studentTf = sub.tf_answers as TFAnswer[];
        for (const correct of finalTfAnswers) {
          const student = studentTf.find((t) => t.question === correct.question);
          if (student) {
            let subCorrect = 0;
            if (student.a === correct.a) subCorrect++;
            if (student.b === correct.b) subCorrect++;
            if (student.c === correct.c) subCorrect++;
            if (student.d === correct.d) subCorrect++;
            let tfScore = 0;
            if (subCorrect === 1) tfScore = 0.1;
            else if (subCorrect === 2) tfScore = 0.25;
            else if (subCorrect === 3) tfScore = 0.5;
            else if (subCorrect === 4) tfScore = 1.0;
            correctCount += tfScore;
          }
        }
      } if (sub.sa_answers && finalSaAnswers.length > 0) { const studentSa = sub.sa_answers as SAAnswer[]; for (const correct of finalSaAnswers) { const student = studentSa.find((s) => s.question === correct.question); if (student) { const correctVal = correct.answer?.toString().trim().toLowerCase(); const studentVal = student.answer?.toString().trim().toLowerCase(); if (correctVal && studentVal && correctVal === studentVal) correctCount++ } } } const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0; await supabase.from("submissions").update({ score, correct_count: Math.round(correctCount * 100) / 100 }).eq("id", sub.id); updatedCount++ } setSuccess(`✅ Đã chấm lại ${updatedCount} bài nộp thành công!`) } catch (err) { setError("Lỗi chấm lại: " + (err as Error).message) } finally { setRegrading(false) } }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang tải thông tin đề thi..." />
  
  if (authError) return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="max-w-md w-full liquid-glass rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-tight">Không đủ quyền truy cập</h2>
        <p className="mb-8 text-[hsl(var(--muted-foreground))]">{authError}</p>
        <Link href="/teacher/dashboard">
          <Button className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">Quay lại Dashboard</Button>
        </Link>
      </div>
    </div>
  )

  return (
    <TeacherShell onLogout={handleLogout}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="max-w-[180px] truncate text-base font-semibold tracking-tight">{title || "Sửa đề thi"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={profile?.full_name || ""} onLogout={handleLogout} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-24 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Teacher dashboard</p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Chỉnh sửa đề thi</h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Cập nhật nội dung và đáp án hệ thống</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRegrade} disabled={regrading} variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent transition-transform active:scale-95">
              {regrading ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Chấm lại bài nộp
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 transition-transform active:scale-95 shadow-lg shadow-[hsl(var(--foreground))]/10">
              {saving ? <DotmSquare1 size={16} dotSize={2} className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu thay đổi
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-center gap-3">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="liquid-glass rounded-[2rem] p-6 space-y-5">
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Save className="h-4 w-4" /> Thông tin cơ bản
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Tên đề thi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" placeholder="VD: Kiểm tra cuối kỳ" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Thời gian (phút)</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Khối lớp giao bài</Label>
                <select
                  value={targetGrade === null ? "" : String(targetGrade)}
                  onChange={(e) => setTargetGrade(e.target.value === "" ? null : Number(e.target.value))}
                  className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-transparent px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--foreground))]"
                >
                  <option value="">Tất cả các khối</option>
                  {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                    <option key={g} value={g} className="bg-[hsl(var(--background))]">
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase text-[hsl(var(--muted-foreground))]">Lớp học cụ thể (tùy chọn)</Label>
                <Input value={targetClasses} onChange={(e) => setTargetClasses(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent" placeholder="VD: A1, A2 (ngăn cách bằng dấu phẩy)" />
              </div>
            </div>
          </div>

          <div className="liquid-glass rounded-[2rem] p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold tracking-tight">Cấu trúc đề thi</h3>
              <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2 py-0.5 text-[10px] font-bold">TỔNG: {mcCount + tfCount + saCount} CÂU</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 text-center">
                <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Trắc nghiệm</Label>
                <Input type="number" value={mcCount} onChange={(e) => handleMcCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center" />
              </div>
              <div className="space-y-2 text-center">
                <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Đúng/Sai</Label>
                <Input type="number" value={tfCount} onChange={(e) => handleTfCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center" />
              </div>
              <div className="space-y-2 text-center">
                <Label className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Điền đáp án</Label>
                <Input type="number" value={saCount} onChange={(e) => handleSaCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-center" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 liquid-glass rounded-[2rem] p-6">
          <h3 className="mb-5 flex items-center gap-2 text-base font-semibold tracking-tight">
            <Shield className="h-5 w-5 text-red-500" /> Mức độ bảo mật
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { level: 0, icon: Shield, label: "Tắt" },
              { level: 1, icon: ShieldCheck, label: "Cơ bản" },
              { level: 2, icon: Camera, label: "Webcam" },
              { level: 3, icon: Mic, label: "+Micro" },
              { level: 4, icon: ShieldAlert, label: "Tối đa" }
            ].map(({ level, icon: Icon, label }) => (
              <button 
                key={level} 
                type="button" 
                onClick={() => setSecurityLevel(level)} 
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95", 
                  securityLevel === level 
                    ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))]/10 shadow-sm" 
                    : "border-[hsl(var(--border))]/60 bg-transparent opacity-60 hover:opacity-100"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold tracking-tight">Bảng đáp án hệ thống</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "mc" as const, label: `Trắc nghiệm (${mcCount})` },
                { key: "tf" as const, label: `Đúng/Sai (${tfCount})` },
                { key: "sa" as const, label: `Điền đáp án (${saCount})` }
              ].map(({ key, label }) => (
                <button 
                  key={key} 
                  onClick={() => setAnswerTab(key)} 
                  className={cn(
                    "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition-all", 
                    answerTab === key 
                      ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-transparent" 
                      : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            {answerTab === "mc" && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {Array.from({ length: mcCount }, (_, i) => (
                  <div key={i} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4 text-center transition-colors hover:bg-[hsl(var(--muted))]/5">
                    <p className="mb-3 text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">Câu {i + 1}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {OPTIONS.map((option) => (
                        <button 
                          key={option} 
                          onClick={() => { const next = [...mcAnswers]; next[i] = option; setMcAnswers(next) }} 
                          className={cn(
                            "rounded-lg border py-2 text-xs font-bold transition-all active:scale-90", 
                            mcAnswers[i] === option 
                              ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-transparent shadow-sm" 
                              : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/40"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {answerTab === "tf" && (
              <div className="space-y-4">
                {Array.from({ length: tfCount }, (_, i) => { 
                  const qNum = mcCount + 1 + i; 
                  const answer = tfAnswers[i] || { question: qNum, a: true, b: true, c: true, d: true }; 
                  return (
                    <div key={i} className="rounded-[1.5rem] border border-[hsl(var(--border))]/60 p-5 hover:bg-[hsl(var(--muted))]/5 transition-colors">
                      <p className="mb-4 font-semibold text-sm tracking-tight border-b border-[hsl(var(--border))]/40 pb-2 flex items-center justify-between">
                        CÂU HỎI {qNum}
                        <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] tracking-[0.2em] uppercase">Đúng / Sai</span>
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        {(["a", "b", "c", "d"] as const).map((sub) => (
                          <div key={sub} className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] text-center">Ý ({sub})</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button 
                                onClick={() => { const next = [...tfAnswers]; if (!next[i]) next[i] = { question: qNum, a: true, b: true, c: true, d: true }; next[i] = { ...next[i], [sub]: true }; setTfAnswers(next) }} 
                                className={cn(
                                  "rounded-xl border py-2 text-xs font-bold transition-all", 
                                  answer[sub] === true ? "bg-emerald-500 text-white border-transparent shadow-sm" : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                                )}
                              >
                                ĐÚNG
                              </button>
                              <button 
                                onClick={() => { const next = [...tfAnswers]; if (!next[i]) next[i] = { question: qNum, a: true, b: true, c: true, d: true }; next[i] = { ...next[i], [sub]: false }; setTfAnswers(next) }} 
                                className={cn(
                                  "rounded-xl border py-2 text-xs font-bold transition-all", 
                                  answer[sub] === false ? "bg-rose-500 text-white border-transparent shadow-sm" : "border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))]"
                                )}
                              >
                                SAI
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {answerTab === "sa" && (
              <div className="space-y-3">
                {Array.from({ length: saCount }, (_, i) => { 
                  const qNum = mcCount + tfCount + 1 + i; 
                  const answer = saAnswers[i] || { question: qNum, answer: "" }; 
                  return (
                    <div key={i} className="flex items-center gap-6 rounded-2xl border border-[hsl(var(--border))]/60 p-4 transition-colors hover:bg-[hsl(var(--muted))]/5">
                      <span className="w-20 text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] tracking-wider">CÂU {qNum}</span>
                      <Input 
                        value={answer.answer?.toString() || ""} 
                        onChange={(e) => { const next = [...saAnswers]; next[i] = { question: qNum, answer: e.target.value }; setSaAnswers(next) }} 
                        className="flex-1 rounded-xl border-[hsl(var(--border))]/60 bg-transparent" 
                        placeholder="Nhập đáp án đúng..." 
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </TeacherShell>
  )
}
