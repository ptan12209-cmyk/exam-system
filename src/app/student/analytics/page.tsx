import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserStats } from "@/lib/gamification"

import { AnalyticsClient } from "./AnalyticsClient"
import type { Submission } from "@/types"

/**
 * Server Component — submissions + exam metadata are joined server-side;
 * charts render client-side from pre-fetched props.
 */
export default async function StudentAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [profileResult, statsResult, subsResponse, examMetaResponse, statsDataResult] = await Promise.all([
    supabase.from("profiles").select("full_name, class").eq("id", user.id).single(),
    getUserStats(user.id, supabase),
    supabase.from("submissions").select("id, exam_id, score, submitted_at").eq("student_id", user.id).order("submitted_at", { ascending: true }),
    supabase.from("exams_public").select("id, title, subject"),
    supabase.from("student_stats").select("*").eq("user_id", user.id).single(),
  ])

  const profile = profileResult.data
  const examMap = new Map((examMetaResponse.data ?? []).map((e) => [e.id, e]))
  const transformed = ((subsResponse.data ?? []).map((submission) => ({
    ...submission,
    exam: examMap.get(submission.exam_id) ?? null,
  })) as unknown as Submission[])

  const scores = transformed.map((item) => item.score)
  let summary = { totalExams: 0, averageScore: 0, bestScore: 0, recentTrend: 0 }
  if (scores.length > 0) {
    summary = {
      totalExams: scores.length,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      bestScore: Math.max(...scores),
      recentTrend:
        scores.length >= 10
          ? scores.slice(-5).reduce((sum, score) => sum + score, 0) / 5 -
            scores.slice(-10, -5).reduce((sum, score) => sum + score, 0) / 5
          : 0,
    }
  }

  return (
    <AnalyticsClient
      fullName={profile?.full_name || ""}
      userClass={profile?.class || ""}
      studentStats={statsResult.stats}
      level={statsDataResult.data?.level ?? 1}
      submissions={transformed}
      summary={summary}
    />
  )
}
