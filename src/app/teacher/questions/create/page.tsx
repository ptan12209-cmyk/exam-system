"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

const SUBJECTS = [
    { value: "physics", label: "Vật Lý" },
    { value: "chemistry", label: "Hóa Học" },
    { value: "math", label: "Toán" },
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
    const [subject, setSubject] = useState("physics")
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

            router.push("/teacher/questions")
        } catch (err) {
            alert("Lỗi: " + (err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/questions">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Thêm câu hỏi mới</h1>
                        <p className="text-slate-400 text-sm">Nhập thông tin câu hỏi trắc nghiệm</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="p-6 space-y-6">
                            {/* Subject & Difficulty */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Môn học</Label>
                                    <select
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
                                    >
                                        {SUBJECTS.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Độ khó</Label>
                                    <select
                                        value={difficulty}
                                        onChange={(e) => setDifficulty(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white"
                                    >
                                        {DIFFICULTIES.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Nội dung câu hỏi</Label>
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Nhập nội dung câu hỏi... (hỗ trợ LaTeX: $E=mc^2$)"
                                    rows={4}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                                <p className="text-xs text-slate-500">
                                    Tip: Dùng $...$ để viết công thức toán: $v = \sqrt{"{2gh}"}$
                                </p>
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                <Label className="text-slate-300">Các đáp án</Label>
                                {["A", "B", "C", "D"].map((letter, idx) => (
                                    <div key={letter} className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCorrectAnswer(letter)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg font-bold transition-colors flex-shrink-0",
                                                correctAnswer === letter
                                                    ? "bg-green-600 text-white"
                                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                            )}
                                        >
                                            {letter}
                                        </button>
                                        <Input
                                            value={options[idx]}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            placeholder={`Đáp án ${letter}`}
                                            className="bg-slate-700/50 border-slate-600 text-white"
                                        />
                                    </div>
                                ))}
                                <p className="text-xs text-slate-500">
                                    Nhấn vào chữ cái để chọn đáp án đúng (đang chọn: {correctAnswer})
                                </p>
                            </div>

                            {/* Explanation */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Giải thích (tùy chọn)</Label>
                                <Textarea
                                    value={explanation}
                                    onChange={(e) => setExplanation(e.target.value)}
                                    placeholder="Giải thích cách giải hoặc lý do chọn đáp án đúng..."
                                    rows={3}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="text-slate-300">Tags (cách nhau bởi dấu phẩy)</Label>
                                <Input
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                    placeholder="động học, lực, chuyển động thẳng đều"
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Link href="/teacher/questions" className="flex-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-slate-600 text-slate-400"
                                    >
                                        Hủy
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
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
