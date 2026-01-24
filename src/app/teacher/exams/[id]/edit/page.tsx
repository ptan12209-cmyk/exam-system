"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Save,
    Loader2,
    CheckCircle2,
    HelpCircle,
    FileText,
    RefreshCw,
    AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = ["A", "B", "C", "D"] as const
type Option = typeof OPTIONS[number]
type TFAnswer = { question: number; a: boolean; b: boolean; c: boolean; d: boolean }
type SAAnswer = { question: number; answer: number | string }

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
                // Initialize array with explicit size to avoid index issues
                const newMc: (Option | null)[] = Array(mc.length).fill(null)
                mc.forEach(item => {
                    const idx = item.question - 1
                    if (idx >= 0 && idx < mc.length) {
                        newMc[idx] = item.answer
                    }
                })
                setMcAnswers(newMc)
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-white bg-white shadow-sm border border-gray-100">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Chỉnh sửa đề thi</h1>
                            <p className="text-gray-500 text-sm mt-1">Cập nhật thông tin và đáp án</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleRegrade}
                            disabled={regrading}
                            variant="outline"
                            className="border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                        >
                            {regrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Chấm lại tất cả
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        {success}
                    </div>
                )}

                {/* Configuration Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base text-gray-800">Thông tin cơ bản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Tên đề thi</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Thời gian (phút)</Label>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base text-gray-800 flex justify-between items-center">
                                <span>Cấu trúc đề thi</span>
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Tổng: {mcCount + tfCount + saCount} câu
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-blue-600 font-semibold uppercase">Trắc nghiệm</Label>
                                    <Input
                                        type="number"
                                        value={mcCount}
                                        onChange={(e) => handleMcCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="bg-white border-blue-200 text-gray-900 focus:ring-blue-500 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-green-600 font-semibold uppercase">Đúng/Sai</Label>
                                    <Input
                                        type="number"
                                        value={tfCount}
                                        onChange={(e) => handleTfCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="bg-white border-green-200 text-gray-900 focus:ring-green-500 h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-purple-600 font-semibold uppercase">Điền đáp án</Label>
                                    <Input
                                        type="number"
                                        value={saCount}
                                        onChange={(e) => handleSaCountChange(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="bg-white border-purple-200 text-gray-900 focus:ring-purple-500 h-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Answer Keys */}
                <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="border-b border-gray-100 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-gray-800">Bảng đáp án</CardTitle>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAnswerTab("mc")}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        answerTab === "mc"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-white text-gray-500 border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    Trắc nghiệm ({mcCount})
                                </button>
                                <button
                                    onClick={() => setAnswerTab("tf")}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        answerTab === "tf"
                                            ? "bg-green-50 text-green-700 border-green-200"
                                            : "bg-white text-gray-500 border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    Đúng/Sai ({tfCount})
                                </button>
                                <button
                                    onClick={() => setAnswerTab("sa")}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                        answerTab === "sa"
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-white text-gray-500 border-transparent hover:bg-gray-50"
                                    )}
                                >
                                    Điền đáp án ({saCount})
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {/* MC Answers */}
                        {answerTab === "mc" && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {Array.from({ length: mcCount }, (_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 p-2 bg-gray-50 rounded border border-gray-100">
                                        <span className="text-xs font-semibold text-gray-500">Câu {i + 1}</span>
                                        <div className="grid grid-cols-2 gap-1 w-full">
                                            {OPTIONS.map((option) => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        const newMc = [...mcAnswers]
                                                        newMc[i] = option
                                                        setMcAnswers(newMc)
                                                    }}
                                                    className={cn(
                                                        "h-7 rounded text-xs font-bold transition-all shadow-sm",
                                                        mcAnswers[i] === option
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-white border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600"
                                                    )}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {mcCount === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400">
                                        Chưa có câu hỏi trắc nghiệm nào
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TF Answers */}
                        {answerTab === "tf" && (
                            <div className="space-y-3">
                                {Array.from({ length: tfCount }, (_, i) => {
                                    const qNum = mcCount + 1 + i
                                    const answer = tfAnswers[i] || { question: qNum, a: true, b: true, c: true, d: true }
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-700 w-16">Câu {qNum}</span>
                                            <div className="flex gap-6">
                                                {(['a', 'b', 'c', 'd'] as const).map((sub) => (
                                                    <div key={sub} className="flex flex-col items-center gap-2">
                                                        <span className="text-xs font-semibold text-gray-500 uppercase">{sub}</span>
                                                        <div className="flex rounded-md shadow-sm">
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
                                                                    "px-2.5 py-1 rounded-l-md text-xs font-bold border-y border-l transition-colors",
                                                                    answer[sub] === true
                                                                        ? "bg-green-600 border-green-600 text-white"
                                                                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
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
                                                                    "px-2.5 py-1 rounded-r-md text-xs font-bold border transition-colors",
                                                                    answer[sub] === false
                                                                        ? "bg-red-500 border-red-500 text-white"
                                                                        : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"
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
                                    <div className="py-12 text-center text-gray-400">
                                        Chưa có câu hỏi Đúng/Sai nào
                                    </div>
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
                                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-sm font-bold text-gray-700 w-16">Câu {qNum}</span>
                                            <Input
                                                value={answer.answer?.toString() || ""}
                                                onChange={(e) => {
                                                    const newSa = [...saAnswers]
                                                    newSa[i] = { question: qNum, answer: e.target.value }
                                                    setSaAnswers(newSa)
                                                }}
                                                placeholder="Nhập đáp án (số hoặc chữ)..."
                                                className="bg-white border-gray-300 text-gray-900 focus:ring-purple-500 flex-1 max-w-md"
                                            />
                                        </div>
                                    )
                                })}
                                {saCount === 0 && (
                                    <div className="py-12 text-center text-gray-400">
                                        Chưa có câu hỏi điền đáp án nào
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
