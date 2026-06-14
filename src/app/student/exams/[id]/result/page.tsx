"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updateStudentStats } from "@/lib/gamification"
import { XpGainAnimation, LevelUpAnimation } from "@/components/gamification/XpBar"
import { NewBadgeAnimation } from "@/components/gamification/BadgeCard"
import { useAchievementUnlock } from "@/components/gamification/AchievementUnlock"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { StudentShell } from "@/components/student/StudentShell"
import { Trophy, CheckCircle2, XCircle, Home, Medal, Share2, RotateCcw, GraduationCap, Lock } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

import type { Exam, Submission } from "@/types"

interface LeaderboardEntry {
  id: string
  score: number
  time_spent: number
  student_id: string
  profile: { full_name: string | null }
}

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

  const { unlock, AchievementPopup } = useAchievementUnlock()
  const [unlockedBadges, setUnlockedBadges] = useState<any[]>([])
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      if (profile) setFullName(profile.full_name || "")

      const { data: examData } = await supabase.from("exams").select("*").eq("id", examId).single()
      if (!examData) { router.push("/student/dashboard"); return }

      setExam(examData)
      const examMaxAttempts = examData.max_attempts ?? 1
      setMaxAttempts(examMaxAttempts)

      const { data: allSubmissions, count } = await supabase.from("submissions").select("*", { count: "exact" }).eq("exam_id", examId).eq("student_id", user.id).order("score", { ascending: false })
      if (!allSubmissions?.length) { router.push(`/student/exams/${examId}/take`); return }

      const currentSubmission = allSubmissions[0]
      setSubmission(currentSubmission)
      setAttemptsUsed(count ?? allSubmissions.length)
      if (examMaxAttempts === 0 || (count ?? 0) < examMaxAttempts) setCanRetake(true)

      const scoreVisMode = examData.score_visibility_mode || "always"
      const scoreThresh = examData.score_visibility_threshold || 0
      setCanViewScore(scoreVisMode === "always" || (scoreVisMode === "threshold" && currentSubmission.score >= scoreThresh))

      const { data: leaderboardData } = await supabase
        .from("submissions")
        .select("id, score, time_spent, student_id, profile:profiles(full_name)")
        .eq("exam_id", examId)
        .order("score", { ascending: false })
        .order("time_spent", { ascending: true })
        .limit(10)

      if (leaderboardData) {
        setLeaderboard(
          leaderboardData.map((item: { id: string; score: number; time_spent: number; student_id: string; profile: { full_name: string | null } | { full_name: string | null }[] | null }) => {
            const profileData = Array.isArray(item.profile) ? item.profile[0] : item.profile
            return { id: item.id, score: item.score, time_spent: item.time_spent, student_id: item.student_id, profile: { full_name: profileData?.full_name ?? null } }
          })
        )
      }

      const xpAwardedKey = `xp_awarded_${examId}_${user.id}_${currentSubmission.id}`
      if (!localStorage.getItem(xpAwardedKey)) {
        try {
          const result = await updateStudentStats(user.id, currentSubmission.score)
          setXpGained(result.xpGained)
          setNewLevel(result.newLevel)
          if (result.leveledUp) setShowLevelUp(true)
          
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

      setLoading(false)
    })()
  }, [examId, router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
  const getScoreColor = (score: number) => score >= 8 ? "text-emerald-600 dark:text-emerald-400" : score >= 6.5 ? "text-indigo-600 dark:text-indigo-400" : score >= 5 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
  const getScoreMessage = (score: number) => score >= 8 ? "Làm tốt lắm" : score >= 6.5 ? "Khá tốt" : score >= 5 ? "Đạt yêu cầu" : "Cần cố gắng thêm"
  const progressPercent = useMemo(() => (exam && submission ? Math.min(100, ((submission.correct_count ?? 0) / exam.total_questions) * 100) : 0), [exam, submission])

  if (loading) return <Loading fullPage label="Đang chấm bài..." />
  if (!exam || !submission) return null

  return (
    <StudentShell>
      {xpGained !== null && xpGained > 0 && <XpGainAnimation xpGained={xpGained} onComplete={() => setXpGained(null)} />}
      {showLevelUp && <LevelUpAnimation newLevel={newLevel} onComplete={() => setShowLevelUp(false)} />}
      {unlockedBadges.length > 0 && currentBadgeIndex < unlockedBadges.length && (
        <NewBadgeAnimation 
          badge={unlockedBadges[currentBadgeIndex]} 
          onComplete={() => setCurrentBadgeIndex(prev => prev + 1)} 
        />
      )}
      {AchievementPopup}

      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
        <div className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/student/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 backdrop-blur-md">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Kết quả</p>
                <h1 className="text-base font-semibold">{exam.title}</h1>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
            </div>
          </div>
        </div>

        <main className="lg:ml-64 px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md">
                <Trophy className="h-4 w-4" /> Result summary
              </div>
              <h2 className="max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl">Kết quả bài làm</h2>
              <p className="mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
                Tổng quan điểm số, tiến độ và lời giải của bạn trong một bố cục rõ ràng, tập trung hơn.
              </p>
            </div>

            <div className="liquid-glass rounded-[2rem] p-6 shadow-sm">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng quan nhanh</p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3">
                  <div className="text-2xl font-semibold">{submission.correct_count ?? 0}</div>
                  <div className="text-[hsl(var(--muted-foreground))]">Đúng</div>
                </div>
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3">
                  <div className="text-2xl font-semibold">{exam.total_questions - (submission.correct_count ?? 0)}</div>
                  <div className="text-[hsl(var(--muted-foreground))]">Sai</div>
                </div>
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 p-3">
                  <div className="text-2xl font-semibold">{formatTime(submission.time_spent ?? 0)}</div>
                  <div className="text-[hsl(var(--muted-foreground))]">Thời gian</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              {canViewScore ? (
                <>
                  <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                    <div className={cn("h-2 w-full", submission.score >= 8 ? "bg-emerald-500" : submission.score >= 5 ? "bg-amber-500" : "bg-red-500")} />
                    <div className="p-8 text-center">
                      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 backdrop-blur-md">
                        <Trophy className={cn("h-12 w-12", getScoreColor(submission.score))} />
                      </div>
                      <h3 className={cn("text-6xl font-semibold tracking-[-2px]", getScoreColor(submission.score))}>{submission.score.toFixed(1)}</h3>
                      <p className="mt-3 text-xl text-[hsl(var(--muted-foreground))]">{getScoreMessage(submission.score)}</p>
                      <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]/30">
                        <div className="h-full rounded-full bg-[hsl(var(--foreground))]" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                    <div className="border-b border-[hsl(var(--border))]/50 p-5">
                      <h3 className="text-lg font-semibold">Chi tiết bài làm</h3>
                    </div>
                    <div className="p-5">
                      {(exam.correct_answers?.length ?? 0) > 0 && (
                        <div className="mb-8">
                          <h4 className="mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Trắc nghiệm</h4>
                          <div className="grid grid-cols-5 gap-2 md:grid-cols-8 lg:grid-cols-10">
                            {(exam.correct_answers || []).map((correct, index) => {
                              const studentAnswer = submission.student_answers?.[index]
                              const isCorrect = studentAnswer === correct
                              return (
                                <div key={index} className={cn("relative aspect-square rounded-2xl border p-2 text-center", isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") }>
                                  <span className="absolute left-2 top-1 text-[10px] text-[hsl(var(--muted-foreground))]">{index + 1}</span>
                                  <span className={cn("mt-4 block text-lg font-semibold", isCorrect ? "text-emerald-700" : "text-red-700")}>{studentAnswer || "-"}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {(exam.tf_answers?.length ?? 0) > 0 && (
                        <div className="mb-8">
                          <h4 className="mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Đúng / Sai</h4>
                          <div className="space-y-3">
                            {exam.tf_answers?.map((tf, index) => {
                              const studentTf = submission.tf_student_answers?.find((item) => item.question === tf.question)
                              return (
                                <div key={index} className="rounded-2xl border border-[hsl(var(--border))]/60 p-4">
                                  <p className="mb-2 font-medium">Câu {tf.question}</p>
                                  <div className="grid grid-cols-4 gap-2">
                                    {(["a", "b", "c", "d"] as const).map((sub) => {
                                      const correct = tf[sub]
                                      const student = studentTf?.[sub]
                                      const isCorrect = student === correct
                                      return (
                                        <div key={sub} className={cn("rounded-xl border p-2 text-center text-xs", isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") }>
                                          <span className="block text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{sub}</span>
                                          <span className="mt-2 block font-semibold">{student === true ? "Đúng" : student === false ? "Sai" : "-"}</span>
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

                      {(exam.sa_answers?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Trả lời ngắn</h4>
                          <div className="space-y-3">
                            {exam.sa_answers?.map((sa, index) => {
                              const studentSa = submission.sa_student_answers?.find((item) => item.question === sa.question)
                              const correctVal = parseFloat(sa.answer.toString().replace(",", "."))
                              const studentVal = studentSa?.answer ? parseFloat(studentSa.answer.replace(",", ".")) : NaN
                              const tolerance = Math.abs(correctVal) * 0.05
                              const isCorrect = !isNaN(studentVal) && Math.abs(correctVal - studentVal) <= tolerance
                              return (
                                <div key={index} className={cn("rounded-2xl border p-4", isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") }>
                                  <div className="mb-2 flex items-center justify-between">
                                    <p className="font-medium">Câu {sa.question}</p>
                                    {isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                                  </div>
                                  <div className="grid gap-3 text-sm md:grid-cols-2">
                                    <div>
                                      <span className="text-[hsl(var(--muted-foreground))]">Câu trả lời</span>
                                      <p className={cn("font-semibold", isCorrect ? "text-emerald-700" : "text-red-700")}>{studentSa?.answer || "-"}</p>
                                    </div>
                                    <div>
                                      <span className="text-[hsl(var(--muted-foreground))]">Đáp án đúng</span>
                                      <p className="font-semibold text-emerald-700">{sa.answer}</p>
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
                <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-8 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 backdrop-blur-md">
                    <Lock className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-semibold">Bài làm đã được nộp</h3>
                  <p className="mt-3 text-[hsl(var(--muted-foreground))]">
                    {exam.score_visibility_mode === "never"
                      ? "Giáo viên không bật chế độ xem điểm cho đề thi này."
                      : `Bạn cần đạt tối thiểu ${exam.score_visibility_threshold?.toFixed(1)} điểm để xem kết quả.`}
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                <h3 className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Thao tác</h3>
                <div className="mt-4 space-y-3">
                  {canRetake && (
                    <Link href={`/student/exams/${examId}/take`} className="block">
                      <Button className="w-full rounded-full">
                        <RotateCcw className="mr-2 h-4 w-4" /> Làm lại
                      </Button>
                    </Link>
                  )}
                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                    {maxAttempts === 0 ? `Đã làm ${attemptsUsed} lần` : `Đã dùng ${attemptsUsed}/${maxAttempts} lượt`}
                  </p>
                  <Link href="/student/dashboard" className="block">
                    <Button variant="outline" className="w-full rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                      <Home className="mr-2 h-4 w-4" /> Về trang chủ
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full rounded-full text-[hsl(var(--muted-foreground))]">
                    <Share2 className="mr-2 h-4 w-4" /> Chia sẻ
                  </Button>
                </div>
              </div>

              {canViewScore && (
                <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
                  <div className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/30 p-4">
                    <h3 className="flex items-center gap-2 text-base font-semibold"><Medal className="h-5 w-5" /> Bảng xếp hạng</h3>
                  </div>
                  <div className="divide-y divide-[hsl(var(--border))]/40">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.id} className={cn("flex items-center justify-between p-4", entry.id === submission.id && "bg-[hsl(var(--muted))]/20") }>
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 text-xs font-semibold">{index + 1}</div>
                          <div>
                            <p className="text-sm font-medium">
                              <Link href={`/profile/${entry.student_id}`} className="hover:underline hover:text-indigo-600 transition-colors">
                                {entry.profile?.full_name || "Ẩn danh"}
                              </Link>
                              {entry.id === submission.id && " (Bạn)"}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{formatTime(entry.time_spent)}</p>
                          </div>
                        </div>
                        <div className="font-semibold">{entry.score.toFixed(1)}</div>
                      </div>
                    ))}
                    {leaderboard.length === 0 && <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Chưa có bảng xếp hạng</div>}
                  </div>
                </div>
              )}
            </aside>
          </section>
        </main>
      </div>
    </StudentShell>
  )
}
