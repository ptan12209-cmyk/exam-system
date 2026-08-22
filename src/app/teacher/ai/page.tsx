"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { ANSWER_JSON_SAMPLE, type ParsedAnswerJson } from "@/lib/answer-json"
import {
  Wand2, Camera, Lightbulb, Loader2, Copy, Check,
  FileText, Sparkles, Save, Image as ImageIcon,
} from "lucide-react"

const inter = { className: "font-inter" }
const mono = { className: "font-jetbrains-mono" }

interface DraftQuestion {
  question_type: "mc" | "tf" | "sa"
  question_text: string
  options?: string[]
  correct_answer: string | number | Record<string, boolean>
  explanation?: string
}

interface Bank {
  id: string
  name: string
}

export default function AiToolsPage() {
  const supabase = createClient()
  const [fullName, setFullName] = useState("")
  const [banks, setBanks] = useState<Bank[]>([])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, { data: bankData }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("question_banks").select("id, name").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      ])
      setFullName(profile?.full_name || "")
      setBanks(bankData ?? [])
    })()
  }, [supabase])

  return (
    <TeacherShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--os-muted)]/20 bg-[var(--os-bg)]/90 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--os-muted)]/20">
              <Sparkles className="h-4 w-4 text-[var(--os-accent)]" />
            </div>
            <span className="text-lg font-bold tracking-tighter">ExamHub AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={fullName} userClass="Giáo viên" role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-card)] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--os-accent)]" /> AI Engine
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              Xưởng AI dành cho giáo viên
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[var(--os-muted)]">
              Sinh câu hỏi từ lý thuyết, đọc đáp án từ ảnh, viết lời giải — mọi kết quả đều là <strong>bản nháp</strong> để bạn duyệt trước khi dùng.
            </p>
          </div>
        </section>

        <Tabs defaultValue="gen" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gen"><Wand2 className="mr-2 h-4 w-4" />Tạo câu hỏi</TabsTrigger>
            <TabsTrigger value="ocr"><Camera className="mr-2 h-4 w-4" />Đáp án từ ảnh</TabsTrigger>
            <TabsTrigger value="explain"><Lightbulb className="mr-2 h-4 w-4" />Lời giải</TabsTrigger>
          </TabsList>

          <TabsContent value="gen"><GenerateQuestionsTab banks={banks} /></TabsContent>
          <TabsContent value="ocr"><OcrTab /></TabsContent>
          <TabsContent value="explain"><ExplainTab /></TabsContent>
        </Tabs>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}

/* ─────────────────────────── Tab 1: Generate ─────────────────────────── */

function GenerateQuestionsTab({ banks }: { banks: Bank[] }) {
  const [content, setContent] = useState("")
  const [mc, setMc] = useState(10)
  const [tf, setTf] = useState(0)
  const [sa, setSa] = useState(0)
  const [bankId, setBankId] = useState("")
  const [loading, setLoading] = useState(false)
  const [drafts, setDrafts] = useState<DraftQuestion[] | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async (save: boolean) => {
    setError(null)
    if (content.trim().length < 50) { setError("Nội dung tối thiểu 50 ký tự."); return }
    if (save && !bankId) { setError("Chọn ngân hàng câu hỏi trước khi lưu."); return }
    setLoading(true); setDrafts(null); setSavedCount(null)
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content, mc_count: mc, tf_count: tf, sa_count: sa,
          bank_id: save ? bankId : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi AI")
      if (save) {
        setSavedCount(data.saved_count ?? 0)
      } else {
        setDrafts(data.drafts ?? [])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">Nội dung lý thuyết (dán hoặc gõ)</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Dán đoạn lý thuyết cần soạn câu hỏi... (tối đa 12.000 ký tự)"
            className="mt-2 rounded-xl border-[var(--os-muted)]/30 bg-[var(--os-bg)] text-sm"
          />
          <p className="mt-1 text-[10px] text-[var(--os-muted)] font-mono">{content.length}/12000 ký tự</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            { label: "Trắc nghiệm", value: mc, set: setMc, max: 40 },
            { label: "Đúng/Sai", value: tf, set: setTf, max: 20 },
            { label: "Trả lời ngắn", value: sa, set: setSa, max: 20 },
          ] as const).map((f) => (
            <div key={f.label}>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">{f.label}</label>
              <input
                type="number" min={0} max={f.max} value={f.value}
                onChange={(e) => f.set(Math.max(0, Math.min(f.max, Number(e.target.value) || 0)))}
                className="mt-2 w-full rounded-xl border border-[var(--os-muted)]/30 bg-[var(--os-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--os-accent)]"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">Lưu trực tiếp vào ngân hàng (tùy chọn)</label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--os-muted)]/30 bg-[var(--os-bg)] px-3 py-2.5 text-sm outline-none"
            >
              <option value="">— Chỉ xem bản nháp —</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Button onClick={() => void generate(false)} disabled={loading} className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold h-11">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Tạo bản nháp
          </Button>
          {bankId && (
            <Button onClick={() => void generate(true)} disabled={loading} variant="outline" className="h-11 rounded-xl border-[var(--os-muted)]/40 font-bold">
              <Save className="mr-2 h-4 w-4" /> Tạo & Lưu
            </Button>
          )}
        </div>

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">{error}</p>}
        {savedCount !== null && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-400">
            ✅ Đã lưu {savedCount} câu hỏi vào ngân hàng. Hãy rà soát lại trước khi dùng!
          </p>
        )}
      </div>

      {drafts && drafts.length > 0 && (
        <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Bản nháp ({drafts.length} câu) — duyệt trước khi dùng</h3>
            <CopyButton text={JSON.stringify(drafts, null, 2)} />
          </div>
          <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {drafts.map((d, i) => (
              <div key={i} className="rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)] p-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase font-mono",
                    d.question_type === "mc" ? "bg-[var(--os-accent)]/15 text-[var(--os-accent)]" :
                    d.question_type === "tf" ? "bg-amber-500/15 text-amber-400" :
                    "bg-emerald-500/15 text-emerald-400")}>
                    {d.question_type.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-[var(--os-muted)] font-mono">#{i + 1}</span>
                </div>
                <p className="mt-2 font-semibold">{d.question_text}</p>
                {d.options && (
                  <ul className="mt-2 grid gap-1 text-xs text-[var(--os-muted)] sm:grid-cols-2">
                    {d.options.map((o, oi) => <li key={oi}>{"ABCD"[oi]}. {o}</li>)}
                  </ul>
                )}
                <p className="mt-2 text-xs font-bold text-emerald-400">Đáp án: {typeof d.correct_answer === "object" ? JSON.stringify(d.correct_answer) : String(d.correct_answer)}</p>
                {d.explanation && <p className="mt-1 text-xs italic text-[var(--os-muted)]">{d.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Tab 2: OCR answers ──────────────────────── */

function OcrTab() {
  const [preview, setPreview] = useState<string | null>(null)
  const [base64, setBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<ParsedAnswerJson | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (file: File | null) => {
    setError(null); setAnswers(null)
    if (!file) return
    if (!file.type.startsWith("image/")) { setError("Chọn file ảnh (JPG/PNG)."); return }
    if (file.size > 4 * 1024 * 1024) { setError("Ảnh tối đa 4MB."); return }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      setBase64(dataUrl.split(",")[1] ?? "")
    }
    reader.readAsDataURL(file)
  }

  const parse = async () => {
    if (!base64) return
    setError(null); setLoading(true); setAnswers(null)
    try {
      const res = await fetch("/api/ai/parse-answer-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi AI")
      setAnswers(data.answers)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const asJson = answers
    ? JSON.stringify({
        multiple_choice: answers.multipleChoice,
        true_false: answers.trueFalse,
        short_answer: answers.shortAnswer,
      }, null, 2)
    : ""

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5 space-y-4">
        <p className="text-xs text-[var(--os-muted)]">
          Chụp/tải ảnh bảng đáp án (đáp án in ra, ảnh chụp đề…). Kết quả ở cùng định dạng với khung nhập JSON thủ công.
        </p>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => fileRef.current?.click()} variant="outline" className="rounded-xl border-[var(--os-muted)]/40 font-bold h-11">
            <ImageIcon className="mr-2 h-4 w-4" /> Chọn ảnh
          </Button>
          <Button onClick={() => void parse()} disabled={!base64 || loading} className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold h-11">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            Đọc đáp án
          </Button>
        </div>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Ảnh đáp án" className="max-h-64 rounded-xl border border-[var(--os-muted)]/20 object-contain" />
        )}
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">{error}</p>}
      </div>

      {answers && (
        <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Kết quả: {answers.multipleChoice.length} MC · {answers.trueFalse.length} TF · {answers.shortAnswer.length} SA
            </h3>
            <CopyButton text={asJson} />
          </div>
          <pre className={cn("max-h-[360px] overflow-auto rounded-xl border border-[var(--os-muted)]/20 bg-[var(--os-bg)] p-4 text-xs", mono.className)}>
            {asJson}
          </pre>
          <p className="mt-3 text-[11px] text-[var(--os-muted)]">
            Dán JSON này vào ô đáp án khi tạo đề (mẫu tham khảo cùng định dạng: <span className="font-mono">multiple_choice / true_false / short_answer</span>).
          </p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Tab 3: Explain ──────────────────────────── */

function ExplainTab() {
  const [questionText, setQuestionText] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setError(null); setExplanation(null)
    if (!questionText.trim() || !correctAnswer.trim()) { setError("Nhập câu hỏi và đáp án."); return }
    setLoading(true)
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_text: questionText, correct_answer: correctAnswer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Lỗi AI")
      setExplanation(data.explanation)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">Câu hỏi</label>
          <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3}
            placeholder="Dán nội dung câu hỏi..." className="mt-2 rounded-xl border-[var(--os-muted)]/30 bg-[var(--os-bg)] text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)]">Đáp án đúng</label>
          <input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="VD: A hoặc 42 hoặc {a:true,...}"
            className="mt-2 w-full rounded-xl border border-[var(--os-muted)]/30 bg-[var(--os-bg)] px-3 py-2.5 text-sm outline-none focus:border-[var(--os-accent)]" />
        </div>
        <Button onClick={() => void run()} disabled={loading} className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold h-11">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
          Viết lời giải
        </Button>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-400">{error}</p>}
      </div>

      {explanation && (
        <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--os-accent)]" /> Lời giải</h3>
            <CopyButton text={explanation} />
          </div>
          <p className="text-sm leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── helpers ─────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline" size="sm"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
      }}
      className="rounded-lg border-[var(--os-muted)]/40 text-xs font-bold bg-transparent"
    >
      {copied ? <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
      {copied ? "Đã copy" : "Copy"}
    </Button>
  )
}
