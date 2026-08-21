"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateStudentStats, getUserStats } from "@/lib/gamification"
import { XpGainAnimation, LevelUpAnimation } from "@/components/gamification/XpBar"
import { NewBadgeAnimation } from "@/components/gamification/BadgeCard"
import { useAchievementUnlock } from "@/components/gamification/AchievementUnlock"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { Trophy, CheckCircle2, XCircle, Home, Medal, Share2, RotateCcw, Lock } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { GAMIFICATION_ENABLED } from "@/lib/features"

import type { Exam, Submission } from "@/types"

interface LeaderboardEntry {
  id: string
  score: number
  time_spent: number
  student_id: string
  profile: { full_name: string | null }
}

interface GradedExamPayload {
  id: string
  title: string
  subject: string
  exam_type: string
  duration: number
  total_questions: number
  max_attempts: number
  score_visibility_mode: string
  score_visibility_threshold: number | null
  correct_answers: string[]
  mc_answers: { question: number; answer: string }[]
  tf_answers: { question: number; a: boolean; b: boolean; c: boolean; d: boolean }[]
  sa_answers: { question: number; answer: string | number }[]
}

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function ExamResultPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  const [exam, setExam] = useState<Exam | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [xpGained, setXpGained] = useState<number | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const [canRetake, setCanRetake] = useState(false)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [canViewScore, setCanViewScore] = useState(true)
  
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

  const { unlock, AchievementPopup } = useAchievementUnlock()
  const [unlockedBadges, setUnlockedBadges] = useState<any[]>([])
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      if (profile) setFullName(profile.full_name || "")

      // Answer keys are only readable server-side once a submission exists —
      // the RPC returns null otherwise. Scalar jsonb RPCs unwrap directly.
      const { data: gradedExam } = await supabase
        .rpc("get_graded_exam_for_student", { exam_uuid: examId })
      const payload = (gradedExam ?? null) as GradedExamPayload | null
      if (!payload) { router.push(`/student/exams/${examId}/take`); return }
      setExam(payload as unknown as Exam)
      const examMaxAttempts = payload.max_attempts ?? 1
      setMaxAttempts(examMaxAttempts)

      const { data: allSubmissions, count } = await supabase.from("submissions").select("*", { count: "exact" }).eq("exam_id", examId).eq("student_id", user.id).order("score", { ascending: false })
      if (!allSubmissions?.length) { router.push(`/student/exams/${examId}/take`); return }

      const currentSubmission = allSubmissions[0]
      setSubmission(currentSubmission)
      setAttemptsUsed(count ?? allSubmissions.length)
      if (examMaxAttempts === 0 || (count ?? 0) < examMaxAttempts) setCanRetake(true)

      const scoreVisMode = payload.score_visibility_mode || "always"
      const scoreThresh = payload.score_visibility_threshold || 0
      setCanViewScore(scoreVisMode === "always" || (scoreVisMode === "threshold" && currentSubmission.score >= scoreThresh))

      // Aggregate ranking via the security-definer RPC (no other students'
      // answers are exposed).
      const { data: leaderboardRows } = await supabase
        .rpc("get_exam_leaderboard", { exam_uuid: examId })

      if (leaderboardRows) {
        setLeaderboard(
          leaderboardRows.slice(0, 10).map((row: { rank: number; student_id: string; student_name: string | null; score: number; time_spent: number }) => ({
            id: row.student_id,
            score: row.score,
            time_spent: row.time_spent,
            student_id: row.student_id,
            profile: { full_name: row.student_name ?? null }
          }))
        )
      }

      if (GAMIFICATION_ENABLED) {
        // Gamification remains in the codebase but is not executed while locked.
        const { stats } = await getUserStats(user.id)
        setStudentStats(stats)

        const xpAwardedKey = `xp_awarded_${examId}_${user.id}_${currentSubmission.id}`
        if (!localStorage.getItem(xpAwardedKey)) {
          try {
            const result = await updateStudentStats(user.id, currentSubmission.score)
            setXpGained(result.xpGained)
            setNewLevel(result.newLevel)
            if (result.leveledUp) setShowLevelUp(true)

            // Re-fetch updated stats after checkin/update
            const { stats: updatedStats } = await getUserStats(user.id)
            setStudentStats(updatedStats)

            // Check for newly unlocked badges
            if (result.newBadges && result.newBadges.length > 0) {
              const { data: badgeData } = await supabase
                .from("badges")
                .select("*")
                .in("name", result.newBadges)
              if (badgeData) {
                setUnlockedBadges(badgeData)
              }
            }

            // Check for newly unlocked achievements
            const { data: achievementData } = await supabase.rpc("check_and_unlock_achievements", {
              p_user_id: user.id
            })
            if (achievementData && achievementData.unlocked && achievementData.unlocked.length > 0) {
              const { data: achData } = await supabase
                .from("achievements")
                .select("*")
                .in("name", achievementData.unlocked)
              if (achData) {
                achData.forEach((ach: any) => {
                  unlock(ach)
                })
              }
            }

            localStorage.setItem(xpAwardedKey, "true")
          } catch (error) {
            console.error("Failed to update stats:", error)
          }
        }
      }

      setLoading(false)
    })()
  }, [examId, router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-400"
    if (score >= 6.5) return "text-[var(--os-accent)]"
    if (score >= 5) return "text-amber-400"
    return "text-red-400"
  }

  const getScoreMessage = (score: number) => {
    if (score >= 8) return "Làm tốt lắm! Xuất sắc 🎉"
    if (score >= 6.5) return "Khá tốt! Hãy cố gắng phát huy 👍"
    if (score >= 5) return "Đạt yêu cầu! Tiếp tục luyện tập nhé 📚"
    return "Cần cố gắng thêm nhiều học sinh nhé 💪"
  }

  const progressPercent = useMemo(() => (exam && submission ? Math.min(100, ((submission.correct_count ?? 0) / exam.total_questions) * 100) : 0), [exam, submission])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
        <Loading label="Đang chấm bài..." />
      </div>
    )
  }

  if (!exam || !submission) return null

  return (
    <StudentShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {GAMIFICATION_ENABLED && xpGained !== null && xpGained > 0 && <XpGainAnimation xpGained={xpGained} onComplete={() => setXpGained(null)} />}
      {GAMIFICATION_ENABLED && showLevelUp && <LevelUpAnimation newLevel={newLevel} onComplete={() => setShowLevelUp(false)} />}
      {GAMIFICATION_ENABLED && unlockedBadges.length > 0 && currentBadgeIndex < unlockedBadges.length && (
        <NewBadgeAnimation 
          badge={unlockedBadges[currentBadgeIndex]} 
          onComplete={() => setCurrentBadgeIndex(prev => prev + 1)} 
        />
      )}
      {GAMIFICATION_ENABLED && AchievementPopup}

      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={studentStats.xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Title Section */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-card)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--os-muted)]">
              <Trophy className="h-4 w-4 text-[var(--os-accent)]" /> Result Summary
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Kết quả bài làm
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--os-muted)] max-w-2xl">
              Tổng quan điểm số, tiến độ và lời giải của bạn trong một bố cục rõ ràng, tập trung hơn.
            </p>
          </div>

          <div className="bg-[var(--os-card)] border border-[var(--os-muted)]/20 rounded-2xl p-6 shadow-sm">
            <p className="text-xs text-[var(--os-muted)] font-mono">Tổng quan nhanh</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl border border-[var(--os-muted)]/20 p-3 bg-[var(--os-bg)]/50">
                <div className={cn("text-2xl font-bold font-mono text-emerald-400")}>{submission.correct_count ?? 0}</div>
                <div className="text-[10px] text-[var(--os-muted)] mt-1 font-mono">Đúng</div>
              </div>
              <div className="rounded-xl border border-[var(--os-muted)]/20 p-3 bg-[var(--os-bg)]/50">
                <div className="text-2xl font-bold font-mono text-red-400">{exam.total_questions - (submission.correct_count ?? 0)}</div>
                <div className="text-[10px] text-[var(--os-muted)] mt-1 font-mono">Sai</div>
              </div>
              <div className="rounded-xl border border-[var(--os-muted)]/20 p-3 bg-[var(--os-bg)]/50">
                <div className="text-2xl font-bold font-mono text-[var(--os-accent)]">{formatTime(submission.time_spent ?? 0)}</div>
                <div className="text-[10px] text-[var(--os-muted)] mt-1 font-mono">Thời gian</div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Panels */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          
          <div className="space-y-6">
            {canViewScore ? (
              <>
                {/* Large Score Plate */}
                <div className="overflow-hidden rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] shadow-sm">
                  <div className={cn("h-1.5 w-full", submission.score >= 8 ? "bg-emerald-500" : submission.score >= 5 ? "bg-amber-500" : "bg-red-500")} />
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-[var(--os-muted)]/20 bg-[var(--os-bg)]">
                      <Trophy className={cn("h-12 w-12", getScoreColor(submission.score))} />
                    </div>
                    <h3 className={cn("text-6xl font-bold tracking-tight font-mono", getScoreColor(submission.score))}>
                      {submission.score.toFixed(1)}
                    </h3>
                    <p className="mt-3 text-lg font-semibold text-[var(--os-fg)]">{getScoreMessage(submission.score)}</p>
                    
                    <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[var(--os-bg)] border border-[var(--os-muted)]/20">
                      <div className="h-full rounded-full bg-[var(--os-accent)]" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <p className="text-[10px] text-[var(--os-muted)] mt-2 font-mono text-right">Hoàn thành {Math.round(progressPercent)}% số câu</p>
                  </div>
                </div>

                {/* Question Details List (Strict Dark Mode Fills) */}
                <div className="overflow-hidden rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)]">
                  <div className="border-b border-[var(--os-muted)]/20 p-5 bg-[var(--os-bg)]/30">
                    <h3 className="text-lg font-bold">Chi tiết bài làm</h3>
                  </div>
                  <div className="p-5">
                    
                    {/* 1. Trắc nghiệm MC */}
                    {(exam.correct_answers?.length ?? 0) > 0 && (
                      <div className="mb-8">
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--os-muted)] font-mono">Ý Trắc nghiệm</h4>
                        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                          {(exam.correct_answers || []).map((correct, index) => {
                            const studentAnswer = submission.student_answers?.[index]
                            const isCorrect = studentAnswer === correct
                            return (
                              <div key={index} className={cn("relative aspect-square rounded-xl border p-2 text-center flex flex-col justify-center", isCorrect ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400") }>
                                <span className="absolute left-1.5 top-1 text-[9px] text-[var(--os-muted)] font-mono">{index + 1}</span>
                                <span className="block text-base font-bold font-mono mt-1">{studentAnswer || "-"}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Đúng / Sai TF */}
                    {(exam.tf_answers?.length ?? 0) > 0 && (
                      <div className="mb-8">
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--os-muted)] font-mono">Đúng / Sai</h4>
                        <div className="space-y-3">
                          {exam.tf_answers?.map((tf, index) => {
                            const studentTf = submission.tf_student_answers?.find((item) => item.question === tf.question)
                            return (
                              <div key={index} className="rounded-xl border border-[var(--os-muted)]/20 p-4 bg-[var(--os-bg)]/55">
                                <p className="mb-3 font-bold text-sm text-[var(--os-fg)]">Câu {tf.question}</p>
                                <div className="grid grid-cols-4 gap-2">
                                  {(["a", "b", "c", "d"] as const).map((sub) => {
                                    const correct = tf[sub]
                                    const student = studentTf?.[sub]
                                    const isCorrect = student === correct
                                    return (
                                      <div key={sub} className={cn("rounded-lg border p-2 text-center text-xs flex flex-col justify-center", isCorrect ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400") }>
                                        <span className="block text-[9px] uppercase text-[var(--os-muted)] font-mono">{sub}</span>
                                        <span className="mt-1 block font-bold">{student === true ? "Đúng" : student === false ? "Sai" : "-"}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Trả lời ngắn SA */}
                    {(exam.sa_answers?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--os-muted)] font-mono">Trả lời ngắn</h4>
                        <div className="space-y-3">
                          {exam.sa_answers?.map((sa, index) => {
                            const studentSa = submission.sa_student_answers?.find((item) => item.question === sa.question)
                            const correctVal = parseFloat(sa.answer.toString().replace(",", "."))
                            const studentVal = studentSa?.answer ? parseFloat(studentSa.answer.replace(",", ".")) : NaN
                            const tolerance = Math.abs(correctVal) * 0.05
                            const isCorrect = !isNaN(studentVal) && Math.abs(correctVal - studentVal) <= tolerance
                            return (
                              <div key={index} className={cn("rounded-xl border p-4 bg-[var(--os-bg)]/55", isCorrect ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10") }>
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="font-bold text-sm text-[var(--os-fg)]">Câu {sa.question}</p>
                                  {isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                                </div>
                                <div className="grid gap-3 text-xs md:grid-cols-2">
                                  <div>
                                    <span className="text-[var(--os-muted)] font-mono">Câu trả lời</span>
                                    <p className={cn("font-bold font-mono text-base mt-0.5", isCorrect ? "text-emerald-400" : "text-red-400")}>{studentSa?.answer || "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-[var(--os-muted)] font-mono">Đáp án đúng</span>
                                    <p className="font-bold font-mono text-base mt-0.5 text-emerald-400">{sa.answer}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--os-muted)]/25 bg-[var(--os-bg)]">
                  <Lock className="h-10 w-10 text-[var(--os-accent)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--os-fg)]">Bài làm đã được nộp</h3>
                <p className="mt-3 text-xs text-[var(--os-muted)] leading-relaxed max-w-sm mx-auto">
                  {exam.score_visibility_mode === "never"
                    ? "Giáo viên không bật chế độ xem điểm cho đề thi này."
                    : `Bạn cần đạt tối thiểu ${exam.score_visibility_threshold?.toFixed(1)} điểm để xem kết quả.`}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Controls */}
          <aside className="space-y-6">
            
            {/* Actions Card */}
            <div className="rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] p-6 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--os-muted)] font-mono">Thao tác</h3>
              <div className="mt-4 space-y-3">
                {canRetake && (
                  <Link href={`/student/exams/${examId}/take`} className="block">
                    <Button className="w-full rounded-xl bg-[var(--os-accent)] hover:bg-[var(--os-accent)]/90 text-[var(--os-accent-fg)] font-bold py-3 transition-all">
                      <RotateCcw className="mr-2 h-4 w-4" /> Làm lại
                    </Button>
                  </Link>
                )}
                <p className="text-center text-[10px] text-[var(--os-muted)] font-mono">
                  {maxAttempts === 0 ? `Đã làm ${attemptsUsed} lần` : `Đã dùng ${attemptsUsed}/${maxAttempts} lượt`}
                </p>
                <Link href="/student/dashboard" className="block">
                  <Button variant="outline" className="w-full rounded-xl border-[var(--os-muted)]/40 text-[var(--os-muted)] hover:text-[var(--os-fg)] bg-transparent py-3 transition-all">
                    <Home className="mr-2 h-4 w-4" /> Về trang chủ
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full rounded-xl text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:bg-[var(--os-bg)] py-3 transition-all">
                  <Share2 className="mr-2 h-4 w-4" /> Chia sẻ kết quả
                </Button>
              </div>
            </div>

            {/* Leaderboard Card */}
            {canViewScore && (
              <div className="overflow-hidden rounded-2xl border border-[var(--os-muted)]/20 bg-[var(--os-card)] shadow-sm">
                <div className="border-b border-[var(--os-muted)]/20 bg-[var(--os-bg)]/40 p-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-[var(--os-fg)]"><Medal className="h-5 w-5 text-[var(--os-accent)]" /> Bảng xếp hạng</h3>
                </div>
                <div className="divide-y divide-[var(--os-muted)]/10 bg-[var(--os-card)]">
                  {leaderboard.map((entry, index) => (
                    <div key={entry.id} className={cn("flex items-center justify-between p-4", entry.student_id === submission.student_id ? "bg-[var(--os-accent)]/10 text-[var(--os-accent)]" : "text-[var(--os-fg)]") }>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold font-mono", entry.student_id === submission.student_id ? "border-[var(--os-accent)]" : "border-[var(--os-muted)]/20")}>{index + 1}</div>
                        <div>
                          <p className="text-sm font-bold">
                            <Link href={`/profile/${entry.student_id}`} className="hover:underline transition-colors">
                              {entry.profile?.full_name || "Ẩn danh"}
                            </Link>
                            {entry.student_id === submission.student_id && " (Bạn)"}
                          </p>
                          <p className="text-[10px] text-[var(--os-muted)] font-mono">{formatTime(entry.time_spent)}</p>
                        </div>
                      </div>
                      <div className="font-bold font-mono text-sm">{entry.score.toFixed(1)}</div>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <div className="p-8 text-center text-xs text-[var(--os-muted)]">Chưa có bảng xếp hạng</div>}
                </div>
              </div>
            )}
          </aside>
        </section>

      </main>
    </StudentShell>
  )
}
