"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Loader2, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

export default function EditExamPage() {
    const router = useRouter(); const params = useParams(); const examId = params.id as string; const supabase = createClient()
    const [loading, setLoading] = useState(true); const [authError, setAuthError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false); const [regrading, setRegrading] = useState(false)
    const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null)
    const [title, setTitle] = useState(""); const [duration, setDuration] = useState(15)
    const [mcCount, setMcCount] = useState(12); const [tfCount, setTfCount] = useState(4); const [saCount, setSaCount] = useState(6)
    const [mcAnswers, setMcAnswers] = useState<(Option | null)[]>([]); const [tfAnswers, setTfAnswers] = useState<TFAnswer[]>([]); const [saAnswers, setSaAnswers] = useState<SAAnswer[]>([])
    const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc")

    useEffect(() => {
        const fetchExam = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError) console.error("Auth error:", authError)
            if (!user) { router.push("/login"); return }
            const { data: exam, error: examError } = await supabase.from("exams").select("*").eq("id", examId).eq("teacher_id", user.id).single()
            if (examError) { console.error("Exam query failed:", examError.message); alert(`Exam fetch error: ${examError.message}`) }
            if (!exam) {
                const { data: anyExam } = await supabase.from("exams").select("teacher_id, title").eq("id", examId).single()
                if (anyExam) { setAuthError(`Bạn không có quyền chỉnh sửa đề thi này. Đề thi thuộc về giáo viên khác.`) }
                else { router.push("/teacher/dashboard") }
                setLoading(false); return
            }
            setTitle(exam.title); setDuration(exam.duration)
            if (exam.mc_answers && exam.mc_answers.length > 0) {
                const mc = exam.mc_answers as { question: number; answer: Option }[]; setMcCount(mc.length)
                const newMc: (Option | null)[] = Array(mc.length).fill(null); mc.forEach(item => { const idx = item.question - 1; if (idx >= 0 && idx < mc.length) newMc[idx] = item.answer }); setMcAnswers(newMc)
            } else if (exam.correct_answers) { setMcCount(exam.correct_answers.length); setMcAnswers(exam.correct_answers) }
            if (exam.tf_answers && exam.tf_answers.length > 0) { setTfCount(exam.tf_answers.length); setTfAnswers(exam.tf_answers) } else { setTfCount(0); setTfAnswers([]) }
            if (exam.sa_answers && exam.sa_answers.length > 0) { setSaCount(exam.sa_answers.length); setSaAnswers(exam.sa_answers) } else { setSaCount(0); setSaAnswers([]) }
            setLoading(false)
        }
        fetchExam()
    }, [examId, router, supabase])

    const handleMcCountChange = (newCount: number) => { setMcCount(newCount); setMcAnswers(Array(newCount).fill(null).map((_, i) => mcAnswers[i] || null)) }
    const handleTfCountChange = (newCount: number) => { setTfCount(newCount); setTfAnswers(Array.from({ length: newCount }, (_, i) => tfAnswers[i] || { question: mcCount + 1 + i, a: true, b: true, c: true, d: true })) }
    const handleSaCountChange = (newCount: number) => { setSaCount(newCount); setSaAnswers(Array.from({ length: newCount }, (_, i) => saAnswers[i] || { question: mcCount + tfCount + 1 + i, answer: "" })) }

    const handleSave = async () => {
        if (!title.trim()) { setError("Vui lòng nhập tên đề thi"); return }
        setSaving(true); setError(null)
        try {
            const mcAnswerObjects = mcAnswers.map((ans, i) => ({ question: i + 1, answer: ans })).filter(a => a.answer !== null)
            const finalTfAnswers = tfAnswers.length > 0 ? tfAnswers.map((tf, i) => ({ ...tf, question: mcCount + 1 + i })) : Array.from({ length: tfCount }, (_, i) => ({ question: mcCount + 1 + i, a: true, b: true, c: true, d: true }))
            const finalSaAnswers = saAnswers.length > 0 ? saAnswers.map((sa, i) => ({ ...sa, question: mcCount + tfCount + 1 + i })) : Array.from({ length: saCount }, (_, i) => ({ question: mcCount + tfCount + 1 + i, answer: "" }))
            const { error: updateError } = await supabase.from("exams").update({ title: title.trim(), duration, total_questions: mcCount + tfCount + saCount, correct_answers: mcAnswers, mc_answers: mcAnswerObjects, tf_answers: tfCount > 0 ? finalTfAnswers : [], sa_answers: saCount > 0 ? finalSaAnswers : [] }).eq("id", examId)
            if (updateError) throw updateError
            router.push("/teacher/dashboard")
        } catch (err) { setError("Lỗi cập nhật: " + (err as Error).message) } finally { setSaving(false) }
    }

    const handleRegrade = async () => {
        if (!confirm("Chấm lại điểm tất cả bài nộp? Hành động này sẽ tính lại điểm dựa trên đáp án hiện tại.")) return
        setRegrading(true); setError(null); setSuccess(null)
        try {
            const mcAnswerObjects = mcAnswers.map((ans, i) => ({ question: i + 1, answer: ans })).filter(a => a.answer !== null)
            const finalTfAnswers = tfAnswers.map((tf, i) => ({ ...tf, question: mcCount + 1 + i }))
            const finalSaAnswers = saAnswers.map((sa, i) => ({ ...sa, question: mcCount + tfCount + 1 + i }))
            await supabase.from("exams").update({ correct_answers: mcAnswers, mc_answers: mcAnswerObjects, tf_answers: tfCount > 0 ? finalTfAnswers : [], sa_answers: saCount > 0 ? finalSaAnswers : [] }).eq("id", examId)
            const { data: submissions } = await supabase.from("submissions").select("id, answers, tf_answers, sa_answers").eq("exam_id", examId)
            if (!submissions || submissions.length === 0) { setSuccess("Không có bài nộp nào để chấm lại."); setRegrading(false); return }
            let updatedCount = 0
            for (const sub of submissions) {
                let correctCount = 0; const totalQuestions = mcCount + tfCount + saCount
                if (sub.answers && mcAnswers.length > 0) { const studentMc = sub.answers as string[]; for (let i = 0; i < mcAnswers.length; i++) { if (mcAnswers[i] && studentMc[i]?.toUpperCase() === mcAnswers[i]) correctCount++ } }
                if (sub.tf_answers && finalTfAnswers.length > 0) { const studentTf = sub.tf_answers as TFAnswer[]; for (let i = 0; i < finalTfAnswers.length; i++) { const correct = finalTfAnswers[i]; const student = studentTf.find(t => t.question === correct.question); if (student && correct) { let tfScore = 0; if (student.a === correct.a) tfScore += 0.25; if (student.b === correct.b) tfScore += 0.25; if (student.c === correct.c) tfScore += 0.25; if (student.d === correct.d) tfScore += 0.25; correctCount += tfScore } } }
                if (sub.sa_answers && finalSaAnswers.length > 0) { const studentSa = sub.sa_answers as SAAnswer[]; for (let i = 0; i < finalSaAnswers.length; i++) { const correct = finalSaAnswers[i]; const student = studentSa.find(s => s.question === correct.question); if (student && correct) { const correctVal = correct.answer?.toString().trim().toLowerCase(); const studentVal = student.answer?.toString().trim().toLowerCase(); if (correctVal && studentVal && correctVal === studentVal) correctCount++ } } }
                const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0
                await supabase.from("submissions").update({ score, correct_count: Math.round(correctCount * 100) / 100 }).eq("id", sub.id)
                updatedCount++
            }
            setSuccess(`✅ Đã chấm lại ${updatedCount} bài nộp thành công!`)
        } catch (err) { setError("Lỗi chấm lại: " + (err as Error).message) } finally { setRegrading(false) }
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
    if (authError) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full glass-card rounded-2xl border-red-200 dark:border-red-800 p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
                <h2 className="text-xl font-bold text-foreground mb-2">Không đủ quyền truy cập</h2>
                <p className="text-muted-foreground mb-6">{authError}</p>
                <Link href="/teacher/dashboard"><Button className="w-full gradient-primary text-white border-0">Quay lại Dashboard</Button></Link>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground bg-card shadow-sm border border-border"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div><h1 className="text-2xl font-bold text-foreground">Chỉnh sửa đề thi</h1><p className="text-muted-foreground text-sm mt-1">Cập nhật thông tin và đáp án</p></div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleRegrade} disabled={regrading} variant="outline" className="border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30">{regrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Chấm lại tất cả</Button>
                        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white border-0 shadow-md shadow-indigo-500/20">{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Lưu thay đổi</Button>
                    </div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3"><AlertCircle className="w-5 h-5 flex-shrink-0" />{error}</div>}
                {success && <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 flex-shrink-0" />{success}</div>}

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="glass-card rounded-2xl p-5 space-y-4">
                        <h3 className="text-base font-bold text-foreground">Thông tin cơ bản</h3>
                        <div className="space-y-2"><Label className="text-foreground font-medium">Tên đề thi</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-card border-border rounded-xl" /></div>
                        <div className="space-y-2"><Label className="text-foreground font-medium">Thời gian (phút)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} className="bg-card border-border rounded-xl" /></div>
                    </div>
                    <div className="glass-card rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center"><h3 className="text-base font-bold text-foreground">Cấu trúc đề thi</h3><span className="text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">Tổng: {mcCount + tfCount + saCount} câu</span></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Trắc nghiệm</Label><Input type="number" value={mcCount} onChange={(e) => handleMcCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="bg-card border-indigo-200 dark:border-indigo-900 rounded-xl h-10" /></div>
                            <div className="space-y-2"><Label className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Đúng/Sai</Label><Input type="number" value={tfCount} onChange={(e) => handleTfCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="bg-card border-emerald-200 dark:border-emerald-900 rounded-xl h-10" /></div>
                            <div className="space-y-2"><Label className="text-xs text-violet-600 dark:text-violet-400 font-semibold uppercase">Điền đáp án</Label><Input type="number" value={saCount} onChange={(e) => handleSaCountChange(Math.max(0, parseInt(e.target.value) || 0))} className="bg-card border-violet-200 dark:border-violet-900 rounded-xl h-10" /></div>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-bold text-foreground">Bảng đáp án</h3>
                        <div className="flex gap-2">
                            {[{ key: "mc" as const, label: `Trắc nghiệm (${mcCount})`, color: "indigo" }, { key: "tf" as const, label: `Đúng/Sai (${tfCount})`, color: "emerald" }, { key: "sa" as const, label: `Điền đáp án (${saCount})`, color: "violet" }].map(({ key, label, color }) => (
                                <button key={key} onClick={() => setAnswerTab(key)} className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                                    answerTab === key ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-400 border-${color}-200 dark:border-${color}-900` : "bg-card text-muted-foreground border-transparent hover:bg-muted/30"
                                )}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6">
                        {answerTab === "mc" && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {Array.from({ length: mcCount }, (_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 p-2 bg-muted/20 rounded-xl border border-border/50">
                                        <span className="text-xs font-semibold text-muted-foreground">Câu {i + 1}</span>
                                        <div className="grid grid-cols-2 gap-1 w-full">{OPTIONS.map((option) => (
                                            <button key={option} onClick={() => { const newMc = [...mcAnswers]; newMc[i] = option; setMcAnswers(newMc) }}
                                                className={cn("h-7 rounded-lg text-xs font-bold transition-all", mcAnswers[i] === option ? "bg-indigo-600 text-white" : "bg-card border border-border text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400")}>{option}</button>
                                        ))}</div>
                                    </div>
                                ))}
                                {mcCount === 0 && <div className="col-span-full py-12 text-center text-muted-foreground">Chưa có câu hỏi trắc nghiệm nào</div>}
                            </div>
                        )}
                        {answerTab === "tf" && (
                            <div className="space-y-3">
                                {Array.from({ length: tfCount }, (_, i) => {
                                    const qNum = mcCount + 1 + i; const answer = tfAnswers[i] || { question: qNum, a: true, b: true, c: true, d: true }
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                                            <span className="text-sm font-bold text-foreground w-16">Câu {qNum}</span>
                                            <div className="flex gap-6">
                                                {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                    <div key={sub} className="flex flex-col items-center gap-2">
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase">{sub}</span>
                                                        <div className="flex rounded-lg shadow-sm overflow-hidden">
                                                            <button onClick={() => { const newTf = [...tfAnswers]; if (!newTf[i]) newTf[i] = { question: qNum, a: true, b: true, c: true, d: true }; newTf[i] = { ...newTf[i], [sub]: true }; setTfAnswers(newTf) }}
                                                                className={cn("px-2.5 py-1 text-xs font-bold border-y border-l transition-colors", answer[sub] === true ? "bg-emerald-600 border-emerald-600 text-white" : "bg-card border-border text-muted-foreground hover:bg-muted/30")}>Đ</button>
                                                            <button onClick={() => { const newTf = [...tfAnswers]; if (!newTf[i]) newTf[i] = { question: qNum, a: true, b: true, c: true, d: true }; newTf[i] = { ...newTf[i], [sub]: false }; setTfAnswers(newTf) }}
                                                                className={cn("px-2.5 py-1 text-xs font-bold border transition-colors", answer[sub] === false ? "bg-red-500 border-red-500 text-white" : "bg-card border-border text-muted-foreground hover:bg-muted/30")}>S</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                                {tfCount === 0 && <div className="py-12 text-center text-muted-foreground">Chưa có câu hỏi Đúng/Sai nào</div>}
                            </div>
                        )}
                        {answerTab === "sa" && (
                            <div className="space-y-3">
                                {Array.from({ length: saCount }, (_, i) => {
                                    const qNum = mcCount + tfCount + 1 + i; const answer = saAnswers[i] || { question: qNum, answer: "" }
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3 bg-muted/20 rounded-xl border border-border/50">
                                            <span className="text-sm font-bold text-foreground w-16">Câu {qNum}</span>
                                            <Input value={answer.answer?.toString() || ""} onChange={(e) => { const newSa = [...saAnswers]; newSa[i] = { question: qNum, answer: e.target.value }; setSaAnswers(newSa) }} placeholder="Nhập đáp án (số hoặc chữ)..." className="bg-card border-border rounded-xl flex-1 max-w-md" />
                                        </div>
                                    )
                                })}
                                {saCount === 0 && <div className="py-12 text-center text-muted-foreground">Chưa có câu hỏi điền đáp án nào</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
