"use client"

import { useState } from "react"
import { AlertCircle, Braces, CheckCircle2, Clipboard, FileJson2 } from "lucide-react"
import {
  ANSWER_JSON_SAMPLE,
  parseAnswerJson,
  type ParsedAnswerJson,
} from "@/lib/answer-json"

interface AnswerJsonImporterProps {
  onImport: (answers: ParsedAnswerJson) => void
  initialAnswers?: ParsedAnswerJson | null
}

function serializeAnswers(answers: ParsedAnswerJson): string {
  return JSON.stringify({
    multiple_choice: answers.multipleChoice,
    true_false: answers.trueFalse,
    short_answer: answers.shortAnswer,
  }, null, 2)
}

export function AnswerJsonImporter({ onImport, initialAnswers }: AnswerJsonImporterProps) {
  const [source, setSource] = useState(
    initialAnswers ? serializeAnswers(initialAnswers) : ANSWER_JSON_SAMPLE
  )
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null)

  const importAnswers = () => {
    try {
      const parsed = parseAnswerJson(source)
      onImport(parsed)
      setMessage({
        type: "success",
        text: `Đã nạp ${parsed.multipleChoice.length} câu trắc nghiệm, ${parsed.trueFalse.length} câu đúng/sai và ${parsed.shortAnswer.length} câu trả lời ngắn.`,
      })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể đọc JSON đáp án.",
      })
    }
  }

  const copyTemplate = async () => {
    await navigator.clipboard?.writeText(ANSWER_JSON_SAMPLE)
    setMessage({ type: "success", text: "Đã sao chép JSON mẫu." })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))]/70 bg-[#111317] text-slate-100 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-slate-950">
            <Braces className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Nhập JSON đáp án</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Một tài liệu, ba mảng theo thứ tự câu: trắc nghiệm, đúng/sai, trả lời ngắn.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copyTemplate()}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <Clipboard className="h-3.5 w-3.5" /> Sao chép mẫu
        </button>
      </div>

      <div className="grid border-b border-white/10 sm:grid-cols-3">
        {[
          ["multiple_choice", "A · B · C · D"],
          ["true_false", "a · b · c · d = boolean"],
          ["short_answer", "chuỗi hoặc số"],
        ].map(([name, hint]) => (
          <div key={name} className="border-b border-white/10 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <code className="text-xs font-semibold text-amber-300">{name}</code>
            <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        <label htmlFor="answer-json-source" className="sr-only">
          Nội dung JSON đáp án
        </label>
        <textarea
          id="answer-json-source"
          value={source}
          onChange={(event) => {
            setSource(event.target.value)
            if (message) setMessage(null)
          }}
          spellCheck={false}
          className="min-h-[360px] w-full resize-y rounded-xl border border-white/10 bg-[#090b0e] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none transition focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/10"
        />

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-5 ${
              message.type === "error"
                ? "border-rose-400/25 bg-rose-400/10 text-rose-200"
                : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {message.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[11px] text-slate-500">
            <FileJson2 className="h-3.5 w-3.5" /> Không gửi dữ liệu tới AI hoặc dịch vụ bên ngoài.
          </p>
          <button
            type="button"
            onClick={importAnswers}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.01]"
          >
            <Braces className="h-4 w-4" /> Kiểm tra & nạp đáp án
          </button>
        </div>
      </div>
    </div>
  )
}
