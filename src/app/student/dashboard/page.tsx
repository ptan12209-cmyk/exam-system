import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserStats } from "@/lib/gamification"

import { StudentDashboardClient } from "./StudentDashboardClient"
import type { Exam } from "@/types"

/**
 * Server Component — dashboard data (exams, submissions, stats, class rank)
 * is fetched on the server; the HTML arrives fully rendered.
 */
export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, nickname, class, grade, class_suffix")
    .eq("id", user.id)
    .single()

  const isX = profile?.nickname === "X"

  let examsQuery = supabase
    .from("exams_public")
    .select("id, title, subject, exam_type, duration, total_questions, assigned_to, target_grade, target_classes, is_scheduled, start_time, end_time, max_attempts, security_level")
    .eq("assigned_to", isX ? "x" : "normal")

  if (!isX && profile?.grade !== null && profile?.grade !== undefined) {
    examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profile.grade}`)
  }

  // Class rank: two chained queries
  const fetchClassRank = async () => {
    if (!profile?.class) return { rank: null as number | null, size: null as number | null }
    const { data: classProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("class", profile.class)

    if (classProfiles && classProfiles.length > 0) {
      const studentIds = classProfiles.map((p) => p.id)
      const { data: classStats } = await supabase
        .from("student_stats")
        .select("user_id, xp")
        .in("user_id", studentIds)

      if (classStats) {
        const sortedStats = [...classStats].sort((a, b) => b.xp - a.xp)
        const rankIndex = sortedStats.findIndex((s) => s.user_id === user.id)
        return { rank: rankIndex !== -1 ? rankIndex + 1 : classProfiles.length, size: classProfiles.length }
      }
      return { rank: 1, size: classProfiles.length }
    }
    return { rank: 1, size: 1 }
  }

  const [rankResult, statsResult, examsResult, submissionsResult] = await Promise.all([
    fetchClassRank(),
    getUserStats(user.id, supabase),
    examsQuery.order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("exam_id, score, submitted_at")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false }),
  ])

  // Client-side class targeting (same rule as before — kept for parity)
  const studentClassSuffix = profile?.class_suffix?.toUpperCase()
  const visibleExams = ((examsResult.data ?? []) as unknown as Exam[]).filter((exam) => {
    if (!isX && exam.target_classes && exam.target_classes.length > 0) {
      return Boolean(studentClassSuffix) &&
        exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix!)
    }
    return true
  })

  return (
    <StudentDashboardClient
      profile={profile ?? null}
      availableExams={visibleExams}
      submissions={(submissionsResult.data ?? []) as { exam_id: string; score: number; submitted_at: string }[]}
      studentStats={statsResult.stats}
      classRank={rankResult.rank}
      classSize={rankResult.size}
    />
  )
}
