"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, Plus, CheckCircle2, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const SUBJECTS = [
    { value: "math", label: "Toán" }, { value: "physics", label: "Vật Lý" }, { value: "chemistry", label: "Hóa Học" },
    { value: "english", label: "Tiếng Anh" }, { value: "biology", label: "Sinh Học" }, { value: "history", label: "Lịch Sử" },
    { value: "geography", label: "Địa Lý" }, { value: "et", label: "Giáo dục kinh tế & pháp luật" },
]
const DIFFICULTIES = [
    { value: 1, label: "⭐ Dễ - Nhận biết" }, { value: 2, label: "⭐⭐ Trung bình - Thông hiểu" },
    { value: 3, label: "⭐⭐⭐ Khó - Vận dụng" }, { value: 4, label: "⭐⭐⭐⭐ Rất khó - Vận dụng cao" },
]

export default function CreateQuestionPage() {
    const router = useRouter(); const supabase = createClient()
    const [saving, setSaving] = useState(false)
    const [subject, setSubject] = useState("math"); const [difficulty, setDifficulty] = useState(2)
    const [content, setContent] = useState(""); const [options, setOptions] = useState(["", "", "", ""])
    const [correctAnswer, setCorrectAnswer] = useState("A"); const [explanation, setExplanation] = useState(""); const [tags, setTags] = useState("")

    const handleOptionChange = (index: number, value: string) => { const newOptions = [...options]; newOptions[index] = value; setOptions(newOptions) }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) { alert("Vui lòng nhập nội dung câu hỏi"); return }
        if (options.some(o => !o.trim())) { alert("Vui lòng nhập đầy đủ 4 đáp án"); return }
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")
            const formattedOptions = options.map((opt, idx) => { const letter = ["A", "B", "C", "D"][idx]; return opt.trim().startsWith(letter + ".") ? opt.trim() : `${letter}. ${opt.trim()}` })
            const { error } = await supabase.from("questions").insert({ teacher_id: user.id, subject, difficulty, content: content.trim(), options: formattedOptions, correct_answer: correctAnswer, explanation: explanation.trim() || null, tags: tags.split(",").map(t => t.trim()).filter(Boolean), is_verified: false })
            if (error) throw error
            router.push("/teacher/exam-bank")
        } catch (err) { alert("Lỗi: " + (err as Error).message) } finally { setSaving(false) }
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/exam-bank"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted/30 bg-card shadow-sm border border-border"><ArrowLeft className="w-5 h-5" /></Button></Link>
                    <div><h1 className="text-2xl font-bold text-foreground">Thêm câu hỏi mới</h1><p className="text-muted-foreground text-sm mt-1">Tạo câu hỏi trắc nghiệm thủ công</p></div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-5 border-b border-border/50">
                            <h2 className="text-lg text-foreground font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />Thông tin câu hỏi</h2>
                            <p className="text-muted-foreground text-sm mt-1">Điền đầy đủ thông tin để tạo câu hỏi mới</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2"><Label className="text-foreground font-medium">Môn học</Label>
                                    <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-foreground">{SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                                <div className="space-y-2"><Label className="text-foreground font-medium">Độ khó</Label>
                                    <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-foreground">{DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground font-medium flex items-center justify-between">Nội dung câu hỏi<span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-lg">Hỗ trợ LaTeX ($...$)</span></Label>
                                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập nội dung câu hỏi... Ví dụ: $E=mc^2$" rows={4} className="bg-card border-border focus:ring-indigo-500 resize-none rounded-xl" />
                            </div>

                            <div className="space-y-4">
                                <Label className="text-foreground font-medium">Các đáp án</Label>
                                <div className="grid gap-3">
                                    {["A", "B", "C", "D"].map((letter, idx) => (
                                        <div key={letter} className="flex items-start gap-3 group">
                                            <button type="button" onClick={() => setCorrectAnswer(letter)} className={cn("w-10 h-10 rounded-xl font-bold transition-all flex-shrink-0 flex items-center justify-center shadow-sm border",
                                                correctAnswer === letter ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900/30" : "bg-card text-muted-foreground border-border hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                            )} title={`Chọn ${letter} là đáp án đúng`}>{correctAnswer === letter ? <CheckCircle2 className="w-5 h-5" /> : letter}</button>
                                            <div className="flex-1"><Input value={options[idx]} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Nhập nội dung đáp án ${letter}...`} className={cn("bg-card rounded-xl", correctAnswer === letter ? "border-emerald-500 ring-1 ring-emerald-100 dark:ring-emerald-900/30" : "border-border")} /></div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><HelpCircle className="w-3 h-3" />Click vào ô chữ cái (A, B, C, D) để chọn đáp án đúng.</p>
                            </div>

                            <div className="space-y-2"><Label className="text-foreground font-medium">Giải thích chi tiết (Tùy chọn)</Label><Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Giải thích cách giải hoặc lý do chọn đáp án đúng..." rows={3} className="bg-card border-border focus:ring-indigo-500 resize-none rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-foreground font-medium">Tags phân loại</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VD: động học, lực, chuyển động thẳng đều (cách nhau bởi dấu phẩy)" className="bg-card border-border focus:ring-indigo-500 rounded-xl" /></div>

                            <div className="flex gap-4 pt-6 mt-6 border-t border-border/50">
                                <Link href="/teacher/exam-bank" className="flex-1"><Button type="button" variant="outline" className="w-full border-border text-muted-foreground">Hủy bỏ</Button></Link>
                                <Button type="submit" disabled={saving} className="flex-1 gradient-primary text-white border-0 shadow-md shadow-indigo-500/20">{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="w-4 h-4 mr-2" />Lưu câu hỏi</>}</Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
