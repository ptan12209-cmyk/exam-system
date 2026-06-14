"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { MathRenderer } from "@/components/ui/math-renderer"
import { Loading } from "@/components/shared/Loading"
import {
  Trophy,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

import type { Question, AnswerDetail, ArenaResult, ArenaSession } from "@/types"

export default function ArenaResultPage() {
  const params = useParams()
  const router = useRouter()
  const arenaId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [arena, setArena] = useState<ArenaSession | null>(null)
  const [myResult, setMyResult] = useState<ArenaResult | null>(null)
  const [allResults, setAllResults] = useState<any[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResultData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        // Fetch arena session
        const { data: arenaData } = await supabase
          .from("arena_sessions")
          .select("*")
          .eq("id", arenaId)
          .single()

        if (!arenaData) {
          router.push("/arena")
          return
        }
        setArena(arenaData)

        // Fetch student's result
        const { data: resultData } = await supabase
          .from("arena_results")
          .select("*, profiles:student_id(full_name)")
          .eq("arena_id", arenaId)
          .eq("student_id", user.id)
          .maybeSingle()

        if (!resultData) {
          // If no result found, they haven't taken it yet, go back to arena lobby
          router.push("/arena")
          return
        }
        setMyResult(resultData)

        // Fetch all results for ranking
        const { data: resultsList } = await supabase
          .from("arena_results")
          .select("student_id, score, time_spent, profiles:student_id(full_name)")
          .eq("arena_id", arenaId)
          .order("score", { ascending: false })
          .order("time_spent", { ascending: true })

        if (resultsList) {
          setAllResults(resultsList)
        }

        // Fetch questions for review
        if (arenaData.exam_id) {
          const { data: questionsData } = await supabase
            .from("questions")
            .select("id, question_text, options, correct_answer, explanation")
            .eq("exam_id", arenaData.exam_id)
            .order("order_index")

          if (questionsData) {
            setQuestions(
              questionsData.map((q: any) => ({
                id: q.id,
                question_text: q.question_text,
                options: q.options || ["A", "B", "C", "D"],
                correct_answer: q.correct_answer,
                explanation: q.explanation,
              }))
            )
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Error fetching arena results details:", err)
        setLoading(false)
      }
    }

    fetchResultData()
  }, [arenaId, router, supabase])

  // Calculate stats
  const rank = useMemo(() => {
    if (!myResult || allResults.length === 0) return 1
    const idx = allResults.findIndex((r) => r.student_id === myResult.student_id)
    return idx !== -1 ? idx + 1 : 1
  }, [myResult, allResults])

  const averageScore = useMemo(() => {
    if (allResults.length === 0) return 0
    const sum = allResults.reduce((acc, r) => acc + r.score, 0)
    return sum / allResults.length
  }, [allResults])

  const top3 = useMemo(() => {
    return allResults.slice(0, 3)
  }, [allResults])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}p ${secs}s`
  }

  const toggleQuestion = (id: string) => {
    setExpandedQuestionId(expandedQuestionId === id ? null : id)
  }

  if (loading) {
    return <Loading fullPage label="Đang tải kết quả đấu trường..." />
  }

  if (!arena || !myResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500">Lỗi: Không tìm thấy kết quả</p>
          <Button onClick={() => router.push("/arena")} className="mt-4">
            Quay lại Đấu trường
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] pb-24">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--card))]/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/arena">
            <Button variant="ghost" size="sm" className="rounded-full gap-2">
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
          </Link>
          <h1 className="text-base md:text-lg font-bold truncate max-w-xs md:max-w-md">
            Kết quả: {arena.name}
          </h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Top Summary Row */}
        <section className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Score & Rank */}
          <div className="liquid-glass rounded-[2rem] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[hsl(var(--border))]/60">
            <div className="absolute top-4 right-4 text-amber-500">
              <Trophy className="h-6 w-6" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
              Hạng của bạn
            </p>
            <h2 className="text-5xl font-extrabold mt-3 text-[hsl(var(--primary))]">
              #{rank} <span className="text-xl font-normal text-muted-foreground">/ {allResults.length}</span>
            </h2>
            <div className="mt-4 flex items-center gap-2 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-full px-3 py-1 text-xs font-semibold">
              <Award className="h-3.5 w-3.5" /> Điểm: {myResult.score.toFixed(1)}
            </div>
          </div>

          {/* Card 2: Stats */}
          <div className="liquid-glass rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[hsl(var(--border))]/60">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                Độ chính xác
              </p>
              <h2 className="text-4xl font-bold mt-2">
                {myResult.correct_count ?? 0} <span className="text-lg font-normal text-muted-foreground">/ {myResult.total_questions ?? 0} câu</span>
              </h2>
            </div>
            <div className="mt-4 space-y-1 text-sm text-[hsl(var(--muted-foreground))]">
              <div className="flex justify-between">
                <span>Tỉ lệ:</span>
                <span className="font-semibold text-[hsl(var(--foreground))]">
                  {Math.round(((myResult.correct_count ?? 0) / (myResult.total_questions ?? 1)) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian làm:</span>
                <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {formatTime(myResult.time_spent)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Comparison */}
          <div className="liquid-glass rounded-[2rem] p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[hsl(var(--border))]/60">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                So sánh lớp
              </p>
              <h2 className="text-4xl font-bold mt-2 flex items-baseline gap-2">
                {myResult.score >= averageScore ? "+" : ""}
                {(myResult.score - averageScore).toFixed(1)}
                <span className="text-xs text-muted-foreground font-normal">so với trung bình ({averageScore.toFixed(1)})</span>
              </h2>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              Bạn thuộc nhóm {(rank / allResults.length * 100).toFixed(0)}% học sinh dẫn đầu.
            </div>
          </div>
        </section>

        {/* Leaderboard and Detail Review */}
        <section className="grid gap-8 md:grid-cols-[0.35fr_0.65fr] items-start">
          {/* Top 3 Leaderboard Widget */}
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/40 p-6 space-y-6">
            <h3 className="font-bold text-base flex items-center gap-2 border-b border-[hsl(var(--border))]/40 pb-3">
              <Trophy className="h-5 w-5 text-amber-500" /> Bảng vàng Đợt thi
            </h3>
            <div className="space-y-4">
              {top3.map((entry, index) => (
                <div
                  key={entry.student_id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    entry.student_id === myResult.student_id
                      ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30"
                      : "bg-transparent border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0
                        ? "bg-amber-500 text-white"
                        : index === 1
                        ? "bg-slate-400 text-white"
                        : "bg-amber-700 text-white"
                    )}
                  >
                    #{index + 1}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    {entry.profiles?.full_name || "Học sinh"}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {entry.score.toFixed(1)} đ ({formatTime(entry.time_spent)})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[hsl(var(--primary))]" /> Đánh giá chi tiết từng câu
            </h3>

            <div className="space-y-3">
              {questions.map((q, index) => {
                // Find student's answer details for this question
                const ansDetail = (myResult.answers || []).find((a) => a.question_id === q.id)
                const userAnswer = ansDetail?.answer || "Chưa trả lời"
                const correctAnswerLetter = ["A", "B", "C", "D"][q.correct_answer] || "A"
                const isCorrect = ansDetail?.is_correct || false
                const isExpanded = expandedQuestionId === q.id

                return (
                  <div
                    key={q.id}
                    className={cn(
                      "rounded-2xl border transition-all duration-200 overflow-hidden",
                      isCorrect
                        ? "border-emerald-500/20 bg-emerald-500/4 hover:border-emerald-500/30"
                        : "border-red-500/20 bg-red-500/4 hover:border-red-500/30"
                    )}
                  >
                    {/* Collapsible header summary */}
                    <div
                      onClick={() => toggleQuestion(q.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        <span className="font-semibold text-sm">
                          Câu {index + 1}:
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-xs md:max-w-md">
                          Bạn chọn: {userAnswer} • Đáp án: {correctAnswerLetter}
                        </span>
                      </div>
                      <div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        )}
                      </div>
                    </div>

                    {/* Detailed Content */}
                    {isExpanded && (
                      <div className="px-4 pb-5 pt-1 border-t border-[hsl(var(--border))]/20 space-y-4">
                        {/* Question Text */}
                        <div className="text-sm text-[hsl(var(--foreground))] bg-[hsl(var(--card))]/35 p-3.5 rounded-xl border border-[hsl(var(--border))]/30">
                          <MathRenderer content={q.question_text || ""} />
                        </div>

                        {/* Options Review */}
                        <div className="grid gap-2">
                          {(q.options || []).map((option, oIdx) => {
                            const optionLetter = ["A", "B", "C", "D"][oIdx]
                            const isSelectedOption = userAnswer === optionLetter
                            const isCorrectOption = correctAnswerLetter === optionLetter

                            return (
                              <div
                                key={oIdx}
                                className={cn(
                                  "p-3 rounded-lg border text-sm flex items-center gap-3",
                                  isCorrectOption
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-50"
                                    : isSelectedOption
                                    ? "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-50"
                                    : "bg-transparent border-[hsl(var(--border))]/40"
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-6 w-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0",
                                    isCorrectOption
                                      ? "bg-emerald-500 text-white"
                                      : isSelectedOption
                                      ? "bg-red-500 text-white"
                                      : "bg-muted/50 text-muted-foreground"
                                  )}
                                >
                                  {optionLetter}
                                </span>
                                <div>
                                  <MathRenderer content={option.replace(/^[A-D]\.\s*/, "")} />
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Solution / Explanation */}
                        {q.explanation && (
                          <div className="mt-4 p-4 rounded-xl bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/10 space-y-2">
                            <p className="text-xs font-bold text-[hsl(var(--primary))] uppercase tracking-wider">
                              Giải thích chi tiết:
                            </p>
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">
                              <MathRenderer content={q.explanation} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
