import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserStats } from "@/lib/gamification"

import { ExamsClient } from "./ExamsClient"
import type { Exam } from "@/types"

/**
 * Server Component — data is fetched on the server so the HTML arrives with
 * the full exam list already rendered (no client fetch waterfall). The
 * interactive shell lives in ExamsClient.
 */
export default async function StudentExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, class, grade, class_suffix, nickname")
    .eq("id", user.id)
    .single()

  const isStudentX = profile?.nickname === "X"

  let examsQuery = supabase
    .from("exams_public")
    .select("id, title, subject, exam_type, description, pdf_url, duration, total_questions, assigned_to, target_grade, target_classes, is_advanced, is_scheduled, start_time, end_time, max_attempts, chapter_id, lesson_id, section_id, created_at")
    .eq("assigned_to", isStudentX ? "x" : "normal")

  if (!isStudentX && profile?.grade !== null && profile?.grade !== undefined) {
    examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profile.grade}`)
  }

  const [statsResult, examsResult, subsResult] = await Promise.all([
    getUserStats(user.id, supabase),
    examsQuery.order("created_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("exam_id, score")
      .eq("student_id", user.id),
  ])

  // Client-side class targeting (same rule as before — kept for parity)
  const studentClassSuffix = profile?.class_suffix?.toUpperCase()
  const visibleExams = ((examsResult.data ?? []) as unknown as Exam[]).filter((exam) => {
    if (exam.target_classes && exam.target_classes.length > 0) {
      return Boolean(studentClassSuffix) &&
        exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix!)
    }
    return true
  })

  // Best score per exam
  const bestScores: [string, number][] = []
  if (subsResult.data) {
    for (const s of subsResult.data) {
      if (!s.exam_id) continue
      const existing = bestScores.find(([id]) => id === s.exam_id)
      if (!existing || s.score > existing[1]) {
        if (existing) existing[1] = s.score
        else bestScores.push([s.exam_id, s.score])
      }
    }
  }

  return (
    <ExamsClient
      user={{
        id: user.id,
        full_name: profile?.full_name ?? undefined,
        class: profile?.class ?? undefined,
      }}
      userProfile={{ grade: profile?.grade ?? null, nickname: profile?.nickname ?? null }}
      studentStats={statsResult.stats}
      exams={visibleExams}
      submissions={bestScores}
    />
  )
}
