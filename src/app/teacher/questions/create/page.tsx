"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherBottomNav } from "@/components/BottomNav"
import { ArrowLeft, Save, Loader2, Plus, CheckCircle2, HelpCircle, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/toast"
import { MAP_SUBJECT_TO_DB } from "@/lib/subjects"

const SUBJECTS = [
  { value: "math", label: "Toán" }, { value: "physics", label: "Vật Lý" }, { value: "chemistry", label: "Hóa Học" },
  { value: "english", label: "Tiếng Anh" }, { value: "biology", label: "Sinh Học" }, { value: "history", label: "Lịch Sử" },
  { value: "geography", label: "Địa Lý" }, { value: "et", label: "Giáo dục kinh tế & pháp luật" },
]
const DIFFICULTIES = [
  { value: 1, label: "⭐ Dễ - Nhận biết" }, { value: 2, label: "⭐⭐ Trung bình - Thông hiểu" },
  { value: 3, label: "⭐⭐⭐ Khó - Vận dụng" }, { value: 4, label: "⭐⭐⭐⭐ Rất khó - Vận dụng cao" },
]
const GRADES = [6, 7, 8, 9, 10, 11, 12]

export default function CreateQuestionPage() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError, warning } = useToast()
  const [saving, setSaving] = useState(false)
  const [subject, setSubject] = useState("math")
  const [difficulty, setDifficulty] = useState(2)
  const [content, setContent] = useState("")
  const [options, setOptions] = useState(["", "", "", ""])
  const [correctAnswer, setCorrectAnswer] = useState("A")
  const [explanation, setExplanation] = useState("")
  const [tags, setTags] = useState("")

  // Hierarchy states
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [selectedChapterId, setSelectedChapterId] = useState<string>("")
  const [selectedLessonId, setSelectedLessonId] = useState<string>("")
  const [selectedSectionId, setSelectedSectionId] = useState<string>("")
  const [availableChapters, setAvailableChapters] = useState<any[]>([])
  const [availableLessons, setAvailableLessons] = useState<any[]>([])
  const [availableSections, setAvailableSections] = useState<any[]>([])

  // Load chapters when Grade or Subject changes
  useEffect(() => {
    if (!selectedGrade || !subject) {
      setAvailableChapters([])
      setAvailableLessons([])
      setAvailableSections([])
      setSelectedChapterId("")
      setSelectedLessonId("")
      setSelectedSectionId("")
      return
    }
    const fetchChapters = async () => {
      const dbSubject = MAP_SUBJECT_TO_DB[subject] || "other"
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
  }, [selectedGrade, subject])

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

  const handleOptionChange = (index: number, value: string) => { const next = [...options]; next[index] = value; setOptions(next) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return warning("Vui lòng nhập nội dung câu hỏi")
    if (options.some((o) => !o.trim())) return warning("Vui lòng nhập đầy đủ 4 đáp án")
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const formattedOptions = options.map((opt, idx) => { const letter = ["A", "B", "C", "D"][idx]; return opt.trim().startsWith(letter + ".") ? opt.trim() : `${letter}. ${opt.trim()}` })
      const { error } = await supabase.from("questions").insert({
        teacher_id: user.id,
        subject,
        difficulty,
        content: content.trim(),
        options: formattedOptions,
        correct_answer: correctAnswer,
        explanation: explanation.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_verified: false,
        chapter_id: selectedChapterId || null,
        lesson_id: selectedLessonId || null,
        section_id: selectedSectionId || null
      })
      if (error) throw error
      success("Đã tạo câu hỏi thành công!")
      router.push("/teacher/exam-bank")
    } catch (err) {
      toastError("Lỗi: " + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const selectClass = "w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm"

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <TeacherSidebar onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pt-20 lg:pt-10 pb-24 lg:ml-64">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/teacher/exam-bank"><Button variant="outline" size="icon" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div><p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Question bank</p><h1 className="text-2xl font-semibold">Thêm câu hỏi mới</h1></div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden">
          <div className="border-b border-[hsl(var(--border))]/50 p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" />Thông tin câu hỏi</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Tạo câu hỏi trắc nghiệm thủ công.</p></div>
          <div className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2"><Label>Môn học</Label><select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectClass}>{SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
              <div className="space-y-2"><Label>Độ khó</Label><select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={selectClass}>{DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
            </div>

            {/* Hierarchy: Khối lớp → Chương → Bài → Phần */}
            <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-4 space-y-4">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" /> Phân loại theo cấu trúc học tập
              </Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Khối lớp</Label>
                  <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className={selectClass}>
                    <option value="">-- Chọn khối --</option>
                    {GRADES.map((g) => <option key={g} value={g}>Khối {g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Chương</Label>
                  <select value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} className={selectClass} disabled={!selectedGrade}>
                    <option value="">-- Chọn chương --</option>
                    {availableChapters.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Bài học</Label>
                  <select value={selectedLessonId} onChange={(e) => setSelectedLessonId(e.target.value)} className={selectClass} disabled={!selectedChapterId}>
                    <option value="">-- Chọn bài --</option>
                    {availableLessons.map((l: any) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[hsl(var(--muted-foreground))]">Phần</Label>
                  <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} className={selectClass} disabled={!selectedLessonId}>
                    <option value="">-- Chọn phần --</option>
                    {availableSections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Phân loại giúp quản lý bài tập theo chương trình học (tuỳ chọn).</p>
            </div>

            <div className="space-y-2"><Label className="flex items-center justify-between">Nội dung câu hỏi<span className="rounded-lg bg-[hsl(var(--muted))]/20 px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">Hỗ trợ LaTeX</span></Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Nhập nội dung câu hỏi..." rows={4} className="rounded-xl" /></div>
            <div className="space-y-4"><Label>Các đáp án</Label><div className="grid gap-3">{["A", "B", "C", "D"].map((letter, idx) => (<div key={letter} className="flex items-start gap-3"><button type="button" onClick={() => setCorrectAnswer(letter)} className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border font-bold transition-all", correctAnswer === letter ? "border-emerald-600 bg-emerald-600 text-white" : "border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]")}>{correctAnswer === letter ? <CheckCircle2 className="h-5 w-5" /> : letter}</button><div className="flex-1"><Input value={options[idx]} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Nhập nội dung đáp án ${letter}...`} className="rounded-xl" /></div></div>))}</div><p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1"><HelpCircle className="h-3 w-3" />Click vào ô chữ cái để chọn đáp án đúng.</p></div>
            <div className="space-y-2"><Label>Giải thích chi tiết (tuỳ chọn)</Label><Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Giải thích cách giải hoặc lý do chọn đáp án đúng..." rows={3} className="rounded-xl" /></div>
            <div className="space-y-2"><Label>Tags phân loại</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="VD: động học, lực, chuyển động thẳng đều" className="rounded-xl" /></div>
            <div className="flex gap-4 border-t border-[hsl(var(--border))]/50 pt-6"><Link href="/teacher/exam-bank" className="flex-1"><Button type="button" variant="outline" className="w-full rounded-full">Hủy bỏ</Button></Link><Button type="submit" disabled={saving} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Lưu câu hỏi</Button></div>
          </div>
        </form>
      </main>
      <TeacherBottomNav />
    </div>
  )
}
