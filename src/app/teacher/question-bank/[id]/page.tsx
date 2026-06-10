"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Loader2, Edit, Trash, HelpCircle, Check, X, Upload } from "lucide-react"
import Latex from "react-latex-next"
import "katex/dist/katex.min.css"
import { MAP_SUBJECT_TO_DB } from "@/lib/subjects"

interface RouteParams {
    params: Promise<{ id: string }>
}

interface Question {
    id: string
    question_type: 'mc' | 'tf' | 'sa'
    difficulty: number
    content: string
    options: string[] | null
    correct_answer: any
    explanation: string | null
    chapter_id?: string | null
    lesson_id?: string | null
    section_id?: string | null
    study_chapters?: { title: string } | null
    study_lessons?: { title: string } | null
    study_sections?: { title: string } | null
}

export default function QuestionBankDetailPage({ params }: RouteParams) {
    const resolvedParams = use(params)
    const bankId = resolvedParams.id
    const router = useRouter()
    const supabase = createClient()
    
    const [bankName, setBankName] = useState("Đang tải...")
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [qType, setQType] = useState<'mc' | 'tf' | 'sa'>('mc')
    const [qDifficulty, setQDifficulty] = useState("1")
    const [qContent, setQContent] = useState("")
    const [qExplanation, setQExplanation] = useState("")
    
    // MC states
    const [mcOptions, setMcOptions] = useState(["", "", "", ""])
    const [mcCorrect, setMcCorrect] = useState("A")
    
    // TF states
    const [tfCorrect, setTfCorrect] = useState({ a: true, b: false, c: false, d: false })
    
    // SA states
    const [saCorrect, setSaCorrect] = useState("")

    // AI PDF states
    const [uploadingPdf, setUploadingPdf] = useState(false)

    // Selection states for categorization
    const [bankSubject, setBankSubject] = useState("")
    const [selectedGrade, setSelectedGrade] = useState<string>("")
    const [selectedChapterId, setSelectedChapterId] = useState<string>("")
    const [selectedLessonId, setSelectedLessonId] = useState<string>("")
    const [selectedSectionId, setSelectedSectionId] = useState<string>("")

    // Lists for dropdown selectors
    const [availableChapters, setAvailableChapters] = useState<any[]>([])
    const [availableLessons, setAvailableLessons] = useState<any[]>([])
    const [availableSections, setAvailableSections] = useState<any[]>([])

    useEffect(() => {
        fetchBankDetails()
        fetchQuestions()
    }, [bankId])

    // Load chapters when Grade or Subject changes
    useEffect(() => {
        if (!selectedGrade || !bankSubject) {
            setAvailableChapters([])
            setAvailableLessons([])
            setAvailableSections([])
            setSelectedChapterId("")
            setSelectedLessonId("")
            setSelectedSectionId("")
            return
        }
        const fetchChapters = async () => {
            const dbSubject = MAP_SUBJECT_TO_DB[bankSubject] || "other"
            const res = await fetch(`/api/study/chapters?subject=${dbSubject}&grade=${selectedGrade}`)
            const data = await res.json()
            if (res.ok && data.data) {
                setAvailableChapters(data.data)
            } else {
                setAvailableChapters([])
            }
        }
        fetchChapters()
        setSelectedChapterId("")
        setSelectedLessonId("")
        setSelectedSectionId("")
    }, [selectedGrade, bankSubject])

    // Load lessons when Chapter changes
    useEffect(() => {
        if (!selectedChapterId) {
            setAvailableLessons([])
            setAvailableSections([])
            setSelectedLessonId("")
            setSelectedSectionId("")
            return
        }
        const fetchLessons = async () => {
            const res = await fetch(`/api/study/lessons?chapter_id=${selectedChapterId}`)
            const data = await res.json()
            if (res.ok && data.data) {
                setAvailableLessons(data.data)
            } else {
                setAvailableLessons([])
            }
        }
        fetchLessons()
        setSelectedLessonId("")
        setSelectedSectionId("")
    }, [selectedChapterId])

    // Load sections when Lesson changes
    useEffect(() => {
        if (!selectedLessonId) {
            setAvailableSections([])
            setSelectedSectionId("")
            return
        }
        const fetchSections = async () => {
            const res = await fetch(`/api/study/sections?lesson_id=${selectedLessonId}`)
            const data = await res.json()
            if (res.ok && data.data) {
                setAvailableSections(data.data)
            } else {
                setAvailableSections([])
            }
        }
        fetchSections()
        setSelectedSectionId("")
    }, [selectedLessonId])

    const fetchBankDetails = async () => {
        const { data } = await supabase.from("question_banks").select("name, subject").eq("id", bankId).single()
        if (data) {
            setBankName(data.name)
            setBankSubject(data.subject)
        }
    }

    const fetchQuestions = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("questions")
            .select(`
                *,
                study_chapters(title),
                study_lessons(title),
                study_sections(title)
            `)
            .eq("bank_id", bankId)
            .order("created_at", { ascending: false })
        
        if (data) setQuestions(data)
        setLoading(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingPdf(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            const formData = new FormData()
            formData.append("file", file)

            const workerUrl = process.env.NEXT_PUBLIC_PDF_WORKER_URL || "http://localhost:8000"
            const res = await fetch(`${workerUrl}/extract-bank-questions`, {
                method: "POST",
                body: formData
            })

            if (!res.ok) throw new Error("Failed to extract questions from PDF")

            const result = await res.json()
            const extractedQuestions = result.questions || []

            if (extractedQuestions.length === 0) {
                alert("Không tìm thấy câu hỏi nào trong file PDF!")
                return
            }

            // Bulk insert
            const insertData = extractedQuestions.map((q: any) => ({
                bank_id: bankId,
                teacher_id: user.id,
                question_type: q.question_type || 'mc',
                difficulty: 2, // Default
                content: q.content,
                options: q.options || null,
                correct_answer: q.correct_answer,
                explanation: q.explanation || "",
                chapter_id: selectedChapterId || null,
                lesson_id: selectedLessonId || null,
                section_id: selectedSectionId || null
            }))

            const { error } = await supabase.from("questions").insert(insertData)
            if (error) throw error

            alert(`Đã thêm thành công ${extractedQuestions.length} câu hỏi từ PDF!`)
            fetchQuestions()
        } catch (error) {
            console.error(error)
            alert("Có lỗi xảy ra khi đọc file PDF bằng AI.")
        } finally {
            setUploadingPdf(false)
            e.target.value = "" // reset
        }
    }

    const handleSaveQuestion = async () => {
        if (!qContent.trim()) return alert("Vui lòng nhập nội dung câu hỏi")
        
        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Unauthorized")

            let options = null
            let correctAnswer = null

            if (qType === 'mc') {
                if (mcOptions.some(o => !o.trim())) return alert("Vui lòng nhập đủ 4 đáp án")
                options = mcOptions
                correctAnswer = mcCorrect
            } else if (qType === 'tf') {
                correctAnswer = tfCorrect
            } else if (qType === 'sa') {
                if (!saCorrect.trim()) return alert("Vui lòng nhập đáp án tự luận")
                correctAnswer = saCorrect
            }

            const { error } = await supabase.from("questions").insert({
                bank_id: bankId,
                teacher_id: user.id,
                question_type: qType,
                difficulty: parseInt(qDifficulty),
                content: qContent,
                options,
                correct_answer: correctAnswer,
                explanation: qExplanation,
                chapter_id: selectedChapterId || null,
                lesson_id: selectedLessonId || null,
                section_id: selectedSectionId || null
            })

            if (error) throw error

            setIsDialogOpen(false)
            resetForm()
            fetchQuestions()
        } catch (error) {
            console.error(error)
            alert("Lỗi lưu câu hỏi")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xoá câu hỏi này?")) return
        const { error } = await supabase.from("questions").delete().eq("id", id)
        if (!error) fetchQuestions()
    }

    const resetForm = () => {
        setQContent("")
        setQExplanation("")
        setMcOptions(["", "", "", ""])
        setSaCorrect("")
        setSelectedGrade("")
        setSelectedChapterId("")
        setSelectedLessonId("")
        setSelectedSectionId("")
    }

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push("/teacher/question-bank")} className="shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{bankName}</h1>
                    <p className="text-muted-foreground text-sm">Quản lý các câu hỏi trong ngân hàng này</p>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border">
                <div className="text-sm">
                    Tổng số: <span className="font-bold text-indigo-600">{questions.length}</span> câu hỏi
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <input type="file" accept="application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploadingPdf} />
                        <Button variant="outline" disabled={uploadingPdf} className="pointer-events-none">
                            {uploadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Nhập từ PDF (AI)
                        </Button>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                            <DialogTitle>Thêm câu hỏi mới</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Loại câu hỏi</Label>
                                    <Select value={qType} onValueChange={(v: any) => setQType(v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mc">Trắc nghiệm (1 đáp án)</SelectItem>
                                            <SelectItem value="tf">Đúng / Sai</SelectItem>
                                            <SelectItem value="sa">Trả lời ngắn / Tự luận</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Độ khó</Label>
                                    <Select value={qDifficulty} onValueChange={setQDifficulty}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Dễ (Nhận biết)</SelectItem>
                                            <SelectItem value="2">2 - Trung bình (Thông hiểu)</SelectItem>
                                            <SelectItem value="3">3 - Khó (Vận dụng)</SelectItem>
                                            <SelectItem value="4">4 - Rất khó (Vận dụng cao)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Phân loại Chương - Bài - Phần */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <div className="space-y-2">
                                    <Label>Khối lớp</Label>
                                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                        <SelectTrigger><SelectValue placeholder="Chọn khối" /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 7 }, (_, i) => i + 6).map((g) => (
                                                <SelectItem key={g} value={String(g)}>Khối lớp {g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Chương học</Label>
                                    <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={!selectedGrade}>
                                        <SelectTrigger><SelectValue placeholder="Chọn chương" /></SelectTrigger>
                                        <SelectContent>
                                            {availableChapters.map((ch) => (
                                                <SelectItem key={ch.id} value={ch.id}>Chương {ch.order_index}: {ch.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bài học</Label>
                                    <Select value={selectedLessonId} onValueChange={setSelectedLessonId} disabled={!selectedChapterId}>
                                        <SelectTrigger><SelectValue placeholder="Chọn bài học" /></SelectTrigger>
                                        <SelectContent>
                                            {availableLessons.map((les) => (
                                                <SelectItem key={les.id} value={les.id}>Bài {les.order_index}: {les.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Phần bài tập</Label>
                                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedLessonId}>
                                        <SelectTrigger><SelectValue placeholder="Chọn phần" /></SelectTrigger>
                                        <SelectContent>
                                            {availableSections.map((sec) => (
                                                <SelectItem key={sec.id} value={sec.id}>Phần {sec.order_index}: {sec.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Nội dung đề bài <span className="text-red-500">*</span></Label>
                                <Textarea 
                                    className="min-h-[100px]" 
                                    placeholder="Nhập nội dung câu hỏi..." 
                                    value={qContent} 
                                    onChange={e => setQContent(e.target.value)} 
                                />
                            </div>

                            {/* MC Options */}
                            {qType === 'mc' && (
                                <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <Label className="font-semibold">Đáp án trắc nghiệm</Label>
                                    {["A", "B", "C", "D"].map((opt, i) => (
                                        <div key={opt} className="flex items-center gap-3">
                                            <div 
                                                onClick={() => setMcCorrect(opt)}
                                                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full border cursor-pointer transition-colors ${mcCorrect === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-slate-100 dark:bg-slate-900'}`}
                                            >
                                                {opt}
                                            </div>
                                            <Input 
                                                placeholder={`Nội dung đáp án ${opt}`} 
                                                value={mcOptions[i]}
                                                onChange={e => {
                                                    const newOpts = [...mcOptions]
                                                    newOpts[i] = e.target.value
                                                    setMcOptions(newOpts)
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <p className="text-xs text-muted-foreground mt-2">Bấm vào chữ A, B, C, D để chọn đáp án đúng.</p>
                                </div>
                            )}

                            {/* TF Options */}
                            {qType === 'tf' && (
                                <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <Label className="font-semibold">Đáp án Đúng/Sai</Label>
                                    {(["a", "b", "c", "d"] as const).map((opt) => (
                                        <div key={opt} className="flex items-center justify-between border-b pb-2 last:border-0">
                                            <span className="font-medium uppercase">Ý {opt}</span>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant={tfCorrect[opt] ? "default" : "outline"} 
                                                    className={tfCorrect[opt] ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                                    size="sm"
                                                    onClick={() => setTfCorrect({...tfCorrect, [opt]: true})}
                                                >
                                                    Đúng
                                                </Button>
                                                <Button 
                                                    variant={!tfCorrect[opt] ? "default" : "outline"} 
                                                    className={!tfCorrect[opt] ? "bg-red-600 hover:bg-red-700" : ""}
                                                    size="sm"
                                                    onClick={() => setTfCorrect({...tfCorrect, [opt]: false})}
                                                >
                                                    Sai
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* SA Options */}
                            {qType === 'sa' && (
                                <div className="space-y-2 border p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                    <Label className="font-semibold">Đáp án trả lời ngắn</Label>
                                    <Input 
                                        placeholder="Nhập đáp án chính xác..." 
                                        value={saCorrect}
                                        onChange={e => setSaCorrect(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">Đáp án này sẽ được dùng để chấm điểm tự động (so khớp chính xác).</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Giải thích đáp án (Không bắt buộc)</Label>
                                <Textarea 
                                    placeholder="Giải thích chi tiết tại sao lại chọn đáp án này để AI Tutor có thể tham khảo..." 
                                    value={qExplanation} 
                                    onChange={e => setQExplanation(e.target.value)} 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleSaveQuestion} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Lưu câu hỏi
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            ) : questions.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">Chưa có câu hỏi nào</h3>
                    <p className="text-slate-500 text-sm mt-1">Bấm "Thêm câu hỏi" để bắt đầu xây dựng kho.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((q, idx) => (
                        <Card key={q.id} className="relative group">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded text-xs">Câu {idx + 1}</span>
                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs uppercase font-medium">
                                            {q.question_type === 'mc' ? 'Trắc nghiệm' : q.question_type === 'tf' ? 'Đúng/Sai' : 'Trả lời ngắn'}
                                        </span>
                                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-xs">Độ khó: {q.difficulty}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(q.id)}>
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                                {(q.study_chapters?.title || q.study_lessons?.title || q.study_sections?.title) && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-2 bg-slate-50 dark:bg-slate-800/30 px-2 py-1 rounded border w-fit border-indigo-50/50 dark:border-indigo-900/10">
                                        {q.study_chapters?.title && <span className="font-medium text-slate-600 dark:text-slate-400">{q.study_chapters.title}</span>}
                                        {q.study_lessons?.title && (
                                            <>
                                                <span className="opacity-40 font-bold">/</span>
                                                <span className="text-slate-600 dark:text-slate-400">{q.study_lessons.title}</span>
                                            </>
                                        )}
                                        {q.study_sections?.title && (
                                            <>
                                                <span className="opacity-40 font-bold">/</span>
                                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{q.study_sections.title}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="whitespace-pre-wrap font-medium overflow-x-auto"><Latex>{q.content}</Latex></div>
                                
                                {q.question_type === 'mc' && q.options && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                        {q.options.map((opt, i) => {
                                            const letter = ["A", "B", "C", "D"][i]
                                            const isCorrect = letter === q.correct_answer
                                            return (
                                                <div key={i} className={`p-2 rounded border text-sm flex items-start gap-2 overflow-x-auto ${isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                    <span className={`font-bold ${isCorrect ? 'text-emerald-600' : ''}`}>{letter}.</span>
                                                    <span className="flex-1"><Latex>{opt}</Latex></span>
                                                    {isCorrect && <Check className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {q.question_type === 'tf' && q.correct_answer && (
                                    <div className="flex gap-4 mt-3">
                                        {(['a','b','c','d'] as const).map(k => (
                                            <div key={k} className="flex flex-col items-center p-2 border rounded bg-slate-50 dark:bg-slate-800/50 min-w-[60px]">
                                                <span className="text-xs uppercase font-bold text-muted-foreground mb-1">Ý {k}</span>
                                                {q.correct_answer[k] ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-500" />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.question_type === 'sa' && (
                                    <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg inline-block">
                                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">Đáp án:</span>
                                        <span className="font-mono">{q.correct_answer}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
