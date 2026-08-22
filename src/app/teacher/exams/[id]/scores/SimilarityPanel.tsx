"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScanSearch, Loader2, ShieldAlert, ChevronDown } from "lucide-react"

interface FlaggedPair {
  a: { id: string; student_id: string; student_name: string | null; score: number }
  b: { id: string; student_id: string; student_name: string | null; score: number }
  shared_wrong_questions: number[]
  identical_answers: number
  overlap: number
  similarity_percent: number
  time_delta_seconds: number
}

interface SimilarityResponse {
  success: boolean
  total_submissions: number
  flagged_count?: number
  flagged?: FlaggedPair[]
  note?: string
}

/**
 * Collusion flagging panel — READ-ONLY. The system marks suspicious pairs;
 * the teacher reviews them against each student's actual ability.
 */
export function SimilarityPanel({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimilarityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = async () => {
    setError(null); setLoading(true)
    try {
      const res = await fetch(`/api/exams/${examId}/similarity`)
      const data = (await res.json()) as SimilarityResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || "Lỗi phân tích")
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden mb-6">
      <button
        onClick={() => { setOpen(!open); if (!open && !result && !loading) void analyze() }}
        className="flex w-full items-center justify-between border-b border-[hsl(var(--border))]/50 p-5 text-left"
      >
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5 text-amber-500" /> Phát hiện trùng đáp án
          </h3>
          <p className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">
            Hệ thống chỉ <strong>đánh dấu</strong> các cặp bài có mẫu sai giống nhau — giáo viên tự xem xét dựa trên học lực thực tế.
          </p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="p-5">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-[hsl(var(--muted-foreground))]">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích từng cặp bài làm...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-red-500">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void analyze()} className="rounded-full">Thử lại</Button>
            </div>
          )}

          {!loading && result && (
            <>
              {(result.note || (result.total_submissions === 0)) ? (
                <p className="py-4 text-sm text-[hsl(var(--muted-foreground))]">
                  {result.note ?? "Chưa có bài nộp nào để phân tích."}
                </p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      {result.total_submissions} bài đã quét ·{" "}
                      <strong className={cn(
                        (result.flagged_count ?? 0) > 0 ? "text-red-500" : "text-emerald-500"
                      )}>
                        {result.flagged_count ?? 0} cặp đáng chú ý
                      </strong>{" "}
                      · tiêu chí: ≥3 câu SAI GIỐNG NHAU hoặc giống nhau ≥90%
                    </p>
                    <Button size="sm" variant="outline" onClick={() => void analyze()} className="rounded-full">
                      <ScanSearch className="mr-1 h-3.5 w-3.5" /> Chạy lại
                    </Button>
                  </div>

                  {(result.flagged?.length ?? 0) === 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center text-sm text-emerald-600">
                      ✅ Không phát hiện cặp bài nào đáng ngờ.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[hsl(var(--border))]/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10 text-left text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            <th className="px-4 py-3">Cặp bài</th>
                            <th className="px-4 py-3 text-center">Sai giống nhau</th>
                            <th className="px-4 py-3 text-center">Giống nhau</th>
                            <th className="px-4 py-3 text-center">Cách nộp</th>
                            <th className="px-4 py-3">Câu số (sai trùng)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--border))]/30">
                          {(result.flagged ?? []).map((pair, idx) => (
                            <tr key={idx} className="align-top hover:bg-[hsl(var(--muted))]/10">
                              <td className="px-4 py-3">
                                <div className="font-medium">
                                  <Link href={`/profile/${pair.a.student_id}`} className="hover:underline">{pair.a.student_name || `HS ${pair.a.student_id.slice(0, 6)}`}</Link>
                                  {" "}<span className="text-xs text-[hsl(var(--muted-foreground))]">({pair.a.score.toFixed(1)}đ)</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">⇅</div>
                                <div className="font-medium">
                                  <Link href={`/profile/${pair.b.student_id}`} className="hover:underline">{pair.b.student_name || `HS ${pair.b.student_id.slice(0, 6)}`}</Link>
                                  {" "}<span className="text-xs text-[hsl(var(--muted-foreground))]">({pair.b.score.toFixed(1)}đ)</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn("inline-flex min-w-[2rem] justify-center rounded-full border px-2 py-1 text-xs font-bold",
                                  pair.shared_wrong_questions.length >= 5
                                    ? "border-red-200 bg-red-50 text-red-600"
                                    : "border-amber-200 bg-amber-50 text-amber-600")}>
                                  {pair.shared_wrong_questions.length} câu
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-xs">{pair.similarity_percent}%<span className="block text-[10px] opacity-60">({pair.identical_answers}/{pair.overlap})</span></td>
                              <td className="px-4 py-3 text-center font-mono text-xs">
                                {pair.time_delta_seconds < 60
                                  ? `${pair.time_delta_seconds}s`
                                  : `${Math.round(pair.time_delta_seconds / 60)} phút`}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs">
                                {pair.shared_wrong_questions.slice(0, 12).join(", ")}
                                {pair.shared_wrong_questions.length > 12 && ` +${pair.shared_wrong_questions.length - 12}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="mt-4 rounded-lg bg-[hsl(var(--muted))]/20 p-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                    ⚖️ Cờ đỏ không phải kết luận. HS giỏi cùng lớp có thể chọn trùng đáp án đúng — trọng số quan trọng nhất là
                    {" "}<strong>số câu SAI trùng khớp</strong> và khoảng cách thời gian nộp. Hãy đối chiếu với học lực và thái độ thực tế của từng em.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
