"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Clock,
    Save,
    Loader2,
    CheckCircle2,
    Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    status: "draft" | "published"
    correct_answers: Option[] | null
    mc_answers: { question: number; answer: Option }[] | null
    tf_answers: TFAnswer[] | null
    sa_answers: SAAnswer[] | null
}

export default function EditExamPage() {
    const router = useRouter()
    const params = useParams()
    const examId = params.id as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [regrading, setRegrading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [title, setTitle] = useState("")
    const [duration, setDuration] = useState(15)
    const [mcCount, setMcCount] = useState(12)
    const [tfCount, setTfCount] = useState(4)
    const [saCount, setSaCount] = useState(6)

    const [mcAnswers, setMcAnswers] = useState<(Option | null)[]>([])
    const [tfAnswers, setTfAnswers] = useState<TFAnswer[]>([])
    const [saAnswers, setSaAnswers] = useState<SAAnswer[]>([])

    const [answerTab, setAnswerTab] = useState<"mc" | "tf" | "sa">("mc")

    useEffect(() => {
        const fetchExam = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: exam, error: examError } = await supabase
                .from("exams")
                .select("*")
                .eq("id", examId)
                .eq("teacher_id", user.id)
                .single()

            if (examError || !exam) {
                router.push("/teacher/dashboard")
                return
            }

            // Load exam data
            setTitle(exam.title)
            setDuration(exam.duration)

            // Load MC answers
            if (exam.mc_answers && exam.mc_answers.length > 0) {
                const mc = exam.mc_answers as { question: number; answer: Option }[]
                setMcCount(mc.length)
                setMcAnswers(mc.map(m => m.answer))
            } else if (exam.correct_answers) {
                setMcCount(exam.correct_answers.length)
                setMcAnswers(exam.correct_answers)
            }

            // Load TF answers
            if (exam.tf_answers && exam.tf_answers.length > 0) {
                setTfCount(exam.tf_answers.length)
                setTfAnswers(exam.tf_answers)
            } else {
                setTfCount(0)
                setTfAnswers([])
            }

            // Load SA answers
            if (exam.sa_answers && exam.sa_answers.length > 0) {
                setSaCount(exam.sa_answers.length)
                setSaAnswers(exam.sa_answers)
            } else {
                setSaCount(0)
                setSaAnswers([])
            }

            setLoading(false)
        }

        fetchExam()
    }, [examId, router, supabase])

    // Update MC array when count changes
    const handleMcCountChange = (newCount: number) => {
        setMcCount(newCount)
        const newMc = Array(newCount).fill(null).map((_, i) => mcAnswers[i] || null)
        setMcAnswers(newMc)
    }

    // Update TF array when count changes
    const handleTfCountChange = (newCount: number) => {
        setTfCount(newCount)
        const newTf = Array.from({ length: newCount }, (_, i) =>
            tfAnswers[i] || { question: mcCount + 1 + i, a: true, b: true, c: true, d: true }
        )
        setTfAnswers(newTf)
    }

    // Update SA array when count changes
    const handleSaCountChange = (newCount: number) => {
        setSaCount(newCount)
        const newSa = Array.from({ length: newCount }, (_, i) =>
            saAnswers[i] || { question: mcCount + tfCount + 1 + i, answer: "" }
        )
        setSaAnswers(newSa)
    }

    const handleSave = async () => {
        if (!title.trim()) {
            setError("Vui lòng nhập tên đề thi")
            return
        }

        setSaving(true)
        setError(null)

        try {
            // Prepare MC answers
            const mcAnswerObjects = mcAnswers.map((ans, i) => ({
                question: i + 1,
                answer: ans
            })).filter(a => a.answer !== null)

            // Prepare TF answers with correct question numbers
            const finalTfAnswers = tfAnswers.length > 0 ? tfAnswers.map((tf, i) => ({
                ...tf,
                question: mcCount + 1 + i
            })) : Array.from({ length: tfCount }, (_, i) => ({
                question: mcCount + 1 + i,
                a: true, b: true, c: true, d: true
            }))

            // Prepare SA answers with correct question numbers
            const finalSaAnswers = saAnswers.length > 0 ? saAnswers.map((sa, i) => ({
                ...sa,
                question: mcCount + tfCount + 1 + i
            })) : Array.from({ length: saCount }, (_, i) => ({
                question: mcCount + tfCount + 1 + i,
                answer: ""
            }))

            const { error: updateError } = await supabase
                .from("exams")
                .update({
                    title: title.trim(),
                    duration,
                    total_questions: mcCount + tfCount + saCount,
                    correct_answers: mcAnswers,
                    mc_answers: mcAnswerObjects,
                    tf_answers: tfCount > 0 ? finalTfAnswers : [],
                    sa_answers: saCount > 0 ? finalSaAnswers : []
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

    const handleRegrade = async () => {
        if (!confirm("Chấm lại điểm tất cả bài nộp? Hành động này sẽ tính lại điểm dựa trên đáp án hiện tại.")) {
            return
        }

        setRegrading(true)
        setError(null)
        setSuccess(null)

        try {
            // First save current answers
            const mcAnswerObjects = mcAnswers.map((ans, i) => ({
                question: i + 1,
                answer: ans
            })).filter(a => a.answer !== null)

            const finalTfAnswers = tfAnswers.map((tf, i) => ({
                ...tf,
                question: mcCount + 1 + i
            }))

            const finalSaAnswers = saAnswers.map((sa, i) => ({
                ...sa,
                question: mcCount + tfCount + 1 + i
            }))

            await supabase
                .from("exams")
                .update({
                    correct_answers: mcAnswers,
                    mc_answers: mcAnswerObjects,
                    tf_answers: tfCount > 0 ? finalTfAnswers : [],
                    sa_answers: saCount > 0 ? finalSaAnswers : []
                })
                .eq("id", examId)

            // Get all submissions for this exam
            const { data: submissions } = await supabase
                .from("submissions")
                .select("id, answers, tf_answers, sa_answers")
                .eq("exam_id", examId)

            if (!submissions || submissions.length === 0) {
                setSuccess("Không có bài nộp nào để chấm lại.")
                setRegrading(false)
                return
            }

            // Recalculate each submission
            let updatedCount = 0
            for (const sub of submissions) {
                let correctCount = 0
                const totalQuestions = mcCount + tfCount + saCount

                // Grade MC answers
                if (sub.answers && mcAnswers.length > 0) {
                    const studentMc = sub.answers as string[]
                    for (let i = 0; i < mcAnswers.length; i++) {
                        if (mcAnswers[i] && studentMc[i]?.toUpperCase() === mcAnswers[i]) {
                            correctCount++
                        }
                    }
                }

                // Grade TF answers (0.25 per correct sub-part)
                if (sub.tf_answers && finalTfAnswers.length > 0) {
                    const studentTf = sub.tf_answers as TFAnswer[]
                    for (let i = 0; i < finalTfAnswers.length; i++) {
                        const correct = finalTfAnswers[i]
                        const student = studentTf.find(t => t.question === correct.question)
                        if (student && correct) {
                            let tfScore = 0
                            if (student.a === correct.a) tfScore += 0.25
                            if (student.b === correct.b) tfScore += 0.25
                            if (student.c === correct.c) tfScore += 0.25
                            if (student.d === correct.d) tfScore += 0.25
                            correctCount += tfScore
                        }
                    }
                }

                // Grade SA answers
                if (sub.sa_answers && finalSaAnswers.length > 0) {
                    const studentSa = sub.sa_answers as SAAnswer[]
                    for (let i = 0; i < finalSaAnswers.length; i++) {
                        const correct = finalSaAnswers[i]
                        const student = studentSa.find(s => s.question === correct.question)
                        if (student && correct) {
                            const correctVal = correct.answer?.toString().trim().toLowerCase()
                            const studentVal = student.answer?.toString().trim().toLowerCase()
                            if (correctVal && studentVal && correctVal === studentVal) {
                                correctCount++
                            }
                        }
                    }
                }

                // Calculate score
                const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0

                // Update submission
                await supabase
                    .from("submissions")
                    .update({ score, correct_count: Math.round(correctCount * 100) / 100 })
                    .eq("id", sub.id)

                updatedCount++
            }

            setSuccess(`✅ Đã chấm lại ${updatedCount} bài nộp thành công!`)
        } catch (err) {
            setError("Lỗi chấm lại: " + (err as Error).message)
        } finally {
            setRegrading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Chỉnh sửa đề thi</h1>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleRegrade}
                            disabled={regrading}
                            variant="outline"
                            className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white"
                        >
                            {regrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            🔄 Chấm lại tất cả
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                        {success}
                    </div>
                )}

                {/* Basic Info */}
                <Card className="border-slate-700 bg-slate-800/50 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white">Thông tin cơ bản</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-slate-300">Tên đề thi</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Thời gian (phút)</Label>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question Counts */}
                <Card className="border-slate-700 bg-slate-800/50 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white">Số câu hỏi</CardTitle>
                        <CardDescription className="text-slate-400">
                            Tổng: {mcCount + tfCount + saCount} câu
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Trắc nghiệm ABCD</Label>
                                <Input
                                    type="number"
                                    value={mcCount}
                                    onChange={(e) => handleMcCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Đúng/Sai</Label>
                                <Input
                                    type="number"
                                    value={tfCount}
                                    onChange={(e) => handleTfCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Trả lời ngắn</Label>
                                <Input
                                    type="number"
                                    value={saCount}
                                    onChange={(e) => handleSaCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Answer Tabs */}
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white">Đáp án</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setAnswerTab("mc")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    answerTab === "mc"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                )}
                            >
                                Trắc nghiệm ({mcCount})
                            </button>
                            <button
                                onClick={() => setAnswerTab("tf")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    answerTab === "tf"
                                        ? "bg-green-600 text-white"
                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                )}
                            >
                                Đúng/Sai ({tfCount})
                            </button>
                            <button
                                onClick={() => setAnswerTab("sa")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    answerTab === "sa"
                                        ? "bg-purple-600 text-white"
                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                )}
                            >
                                Trả lời ngắn ({saCount})
                            </button>
                        </div>

                        {/* MC Answers */}
                        {answerTab === "mc" && (
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                {Array.from({ length: mcCount }, (_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-700/30 rounded-lg">
                                        <span className="text-xs text-slate-400">Câu {i + 1}</span>
                                        <div className="flex gap-1">
                                            {OPTIONS.map((option) => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        const newMc = [...mcAnswers]
                                                        newMc[i] = option
                                                        setMcAnswers(newMc)
                                                    }}
                                                    className={cn(
                                                        "w-8 h-8 rounded text-xs font-bold transition-colors",
                                                        mcAnswers[i] === option
                                                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
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

                        {/* TF Answers */}
                        {answerTab === "tf" && (
                            <div className="space-y-4">
                                {Array.from({ length: tfCount }, (_, i) => {
                                    const qNum = mcCount + 1 + i
                                    const answer = tfAnswers[i] || { question: qNum, a: true, b: true, c: true, d: true }
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                                            <span className="text-sm font-medium text-slate-300 w-20">Câu {qNum}</span>
                                            <div className="flex gap-4">
                                                {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                    <div key={sub} className="flex flex-col items-center gap-1">
                                                        <span className="text-xs text-slate-500">{sub})</span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    const newTf = [...tfAnswers]
                                                                    if (!newTf[i]) {
                                                                        newTf[i] = { question: qNum, a: true, b: true, c: true, d: true }
                                                                    }
                                                                    newTf[i] = { ...newTf[i], [sub]: true }
                                                                    setTfAnswers(newTf)
                                                                }}
                                                                className={cn(
                                                                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                                                                    answer[sub] === true
                                                                        ? "bg-green-600 text-white"
                                                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                                )}
                                                            >
                                                                Đ
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const newTf = [...tfAnswers]
                                                                    if (!newTf[i]) {
                                                                        newTf[i] = { question: qNum, a: true, b: true, c: true, d: true }
                                                                    }
                                                                    newTf[i] = { ...newTf[i], [sub]: false }
                                                                    setTfAnswers(newTf)
                                                                }}
                                                                className={cn(
                                                                    "px-2 py-1 rounded text-xs font-medium transition-colors",
                                                                    answer[sub] === false
                                                                        ? "bg-red-600 text-white"
                                                                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                                )}
                                                            >
                                                                S
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                                {tfCount === 0 && (
                                    <p className="text-center text-slate-500 py-8">Không có câu Đúng/Sai</p>
                                )}
                            </div>
                        )}

                        {/* SA Answers */}
                        {answerTab === "sa" && (
                            <div className="space-y-3">
                                {Array.from({ length: saCount }, (_, i) => {
                                    const qNum = mcCount + tfCount + 1 + i
                                    const answer = saAnswers[i] || { question: qNum, answer: "" }
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-lg">
                                            <span className="text-sm font-medium text-slate-300 w-20">Câu {qNum}</span>
                                            <Input
                                                value={answer.answer?.toString() || ""}
                                                onChange={(e) => {
                                                    const newSa = [...saAnswers]
                                                    newSa[i] = { question: qNum, answer: e.target.value }
                                                    setSaAnswers(newSa)
                                                }}
                                                placeholder="Nhập đáp án số..."
                                                className="bg-slate-700/50 border-slate-600 text-white flex-1"
                                            />
                                        </div>
                                    )
                                })}
                                {saCount === 0 && (
                                    <p className="text-center text-slate-500 py-8">Không có câu Trả lời ngắn</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
