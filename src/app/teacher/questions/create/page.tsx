"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Trash2,
    CheckCircle2,
    HelpCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

const SUBJECTS = [
    { value: "math", label: "Toán" },
    { value: "physics", label: "Vật Lý" },
    { value: "chemistry", label: "Hóa Học" },
    { value: "english", label: "Tiếng Anh" },
    { value: "biology", label: "Sinh Học" },
    { value: "history", label: "Lịch Sử" },
    { value: "geography", label: "Địa Lý" },
    { value: "et", label: "Giáo dục kinh tế & pháp luật" },
]

const DIFFICULTIES = [
    { value: 1, label: "⭐ Dễ - Nhận biết" },
    { value: 2, label: "⭐⭐ Trung bình - Thông hiểu" },
    { value: 3, label: "⭐⭐⭐ Khó - Vận dụng" },
    { value: 4, label: "⭐⭐⭐⭐ Rất khó - Vận dụng cao" },
]

export default function CreateQuestionPage() {
    const router = useRouter()
    const supabase = createClient()

    const [saving, setSaving] = useState(false)
    const [subject, setSubject] = useState("math")
    const [difficulty, setDifficulty] = useState(2)
    const [content, setContent] = useState("")
    const [options, setOptions] = useState(["", "", "", ""])
    const [correctAnswer, setCorrectAnswer] = useState("A")
    const [explanation, setExplanation] = useState("")
    const [tags, setTags] = useState("")

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!content.trim()) {
            alert("Vui lòng nhập nội dung câu hỏi")
            return
        }

        if (options.some(o => !o.trim())) {
            alert("Vui lòng nhập đầy đủ 4 đáp án")
            return
        }

        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const formattedOptions = options.map((opt, idx) => {
                const letter = ["A", "B", "C", "D"][idx]
                // Add letter prefix if not present
                if (!opt.trim().startsWith(letter + ".")) {
                    return `${letter}. ${opt.trim()}`
                }
                return opt.trim()
            })

            const { error } = await supabase.from("questions").insert({
                teacher_id: user.id,
                subject,
                difficulty,
                content: content.trim(),
                options: formattedOptions,
                correct_answer: correctAnswer,
                explanation: explanation.trim() || null,
                tags: tags.split(",").map(t => t.trim()).filter(Boolean),
                is_verified: false
            })

            if (error) throw error

            // Redirect back to bank or some question list
            // For now, let's assume we go back to dashboard or bank
            router.push("/teacher/exam-bank")
        } catch (err) {
            alert("Lỗi: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/exam-bank">
                        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-white bg-white shadow-sm border border-gray-200">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Thêm câu hỏi mới</h1>
                        <p className="text-gray-500 text-sm mt-1">Tạo câu hỏi trắc nghiệm thủ công</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-gray-200 shadow-sm bg-white">
                        <CardHeader className="border-b border-gray-50 pb-4">
                            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Thông tin câu hỏi
                            </CardTitle>
                            <CardDescription>Điền đầy đủ thông tin để tạo câu hỏi mới</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Subject & Difficulty */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Môn học</Label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                    >
                                        {SUBJECTS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-medium">Độ khó</Label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                                    >
                                        {DIFFICULTIES.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium flex items-center justify-between">
                                    Nội dung câu hỏi
                                    <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Hỗ trợ LaTeX ($...$)</span>
                                </Label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Nhập nội dung câu hỏi... Ví dụ: $E=mc^2$"
                                    rows={4}
                                    className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                            </div>

                            {/* Options */}
                            <div className="space-y-4">
                                <Label className="text-gray-700 font-medium">Các đáp án</Label>
                                <div className="grid gap-3">
                                    {["A", "B", "C", "D"].map((letter, idx) => (
                                        <div key={letter} className="flex items-start gap-3 group">
                                            <button
                                                type="button"
                                                onClick={() => setCorrectAnswer(letter)}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg font-bold transition-all flex-shrink-0 flex items-center justify-center shadow-sm border",
                                                    correctAnswer === letter
                                                        ? "bg-green-600 text-white border-green-600 ring-2 ring-green-100"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                                                )}
                                                title={`Chọn ${letter} là đáp án đúng`}
                                            >
                                                {correctAnswer === letter ? <CheckCircle2 className="w-5 h-5" /> : letter}
                                            </button>
                                            <div className="flex-1">
                                                <Input
                                                    value={options[idx]}
                                                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                    placeholder={`Nhập nội dung đáp án ${letter}...`}
                                                    className={cn(
                                                        "bg-white focus:ring-blue-500 focus:border-blue-500",
                                                        correctAnswer === letter ? "border-green-500 ring-1 ring-green-100" : "border-gray-300"

                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" />
                                    Click vào ô chữ cái (A, B, C, D) để chọn đáp án đúng.
                                </p>
                            </div>

                            {/* Explanation */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Giải thích chi tiết (Tùy chọn)</Label>
                                <Textarea
                                    value={explanation}
                                    onChange={(e) => setExplanation(e.target.value)}
                                    placeholder="Giải thích cách giải hoặc lý do chọn đáp án đúng..."
                                    rows={3}
                                    className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Tags phân loại</Label>
                                <Input
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="VD: động học, lực, chuyển động thẳng đều (cách nhau bởi dấu phẩy)"
                                    className="bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100">
                                <Link href="/teacher/exam-bank" className="flex-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Hủy bỏ
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Lưu câu hỏi
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    )
}
