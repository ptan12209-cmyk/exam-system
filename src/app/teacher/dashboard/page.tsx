import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import { TeacherDashboardClient, type DashboardSubmission } from "./TeacherDashboardClient"
import type { Exam } from "@/types"

/**
 * Server Component — KPIs, chart series and recent lists are computed on the
 * server; the client shell only draws (Recharts) from pre-fetched props.
 */
export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: profile }, examsResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("exams")
      .select("*, submissions(count)")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

  const [subsResult, studentsResult] = await Promise.all([
    supabase
      .from("submissions")
      .select(`
        id,
        exam_id,
        score,
        submitted_at,
        student_id,
        student:profiles!student_id(full_name, class, avatar_url),
        exam:exams(title, subject)
      `)
      .gte("submitted_at", eightDaysAgo)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student"),
  ])

  const fetchedExams = ((examsResult.data ?? []).map((e: Record<string, unknown>) => ({
    ...e,
    submission_count: Array.isArray(e.submissions) && e.submissions.length
      ? (e.submissions as { count: number }[])[0].count
      : 0,
  }))) as unknown as Exam[]

  const submissions = (subsResult.data ?? []) as unknown as DashboardSubmission[]
  const totalStudents = studentsResult.count || 0

  // --- Derived stats (server-side) ---
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const examsCreatedThisWeek = fetchedExams.filter(
    (e) => new Date(e.created_at || "") >= sevenDaysAgo
  ).length
  const newSubmissionsCount = submissions.filter(
    (s) => new Date(s.submitted_at || "") >= oneDayAgo
  ).length
  const activeIds = new Set(
    submissions.filter((s) => new Date(s.submitted_at || "") >= sevenDaysAgo).map((s) => s.student_id)
  )
  const activeStudentsThisWeek = activeIds.size
  const activeStudentsPercent =
    totalStudents === 0 ? 0 : Math.round((activeStudentsThisWeek / totalStudents) * 100)

  // Chart 1: 7-day activity
  const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
  const temp = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      dayName: days[d.getDay()],
      submissions: 0,
      activeStudents: new Set<string>(),
    }
  })
  submissions.forEach((s) => {
    const sDate = new Date(s.submitted_at || "")
    temp.forEach((t, idx) => {
      const tDate = new Date()
      tDate.setDate(tDate.getDate() - (6 - idx))
      if (sDate.getDate() === tDate.getDate() && sDate.getMonth() === tDate.getMonth()) {
        t.submissions++
        if (s.student_id) t.activeStudents.add(s.student_id)
      }
    })
  })
  const dailyActivityData = temp.map((t) => ({
    name: t.dayName,
    "Lượt nộp": t.submissions,
    "Học sinh": t.activeStudents.size,
  }))

  // Chart 2: score distribution
  let xuatSac = 0, gioi = 0, kha = 0, trungBinh = 0, yeu = 0
  submissions.forEach((s) => {
    if (s.score >= 9) xuatSac++
    else if (s.score >= 7) gioi++
    else if (s.score >= 5) kha++
    else if (s.score >= 3) trungBinh++
    else yeu++
  })
  const scoreDistribution = [
    { name: "Xuất sắc (≥9)", value: xuatSac, color: "#10B981" },
    { name: "Giỏi (7-8.9)", value: gioi, color: "#3B82F6" },
    { name: "Khá (5-6.9)", value: kha, color: "var(--os-accent)" },
    { name: "Trung bình (3-4.9)", value: trungBinh, color: "var(--os-muted)" },
    { name: "Yếu (<3)", value: yeu, color: "#EF4444" },
  ].filter((item) => item.value > 0)

  const averageScore =
    submissions.length === 0
      ? 0
      : parseFloat((submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1))

  return (
    <TeacherDashboardClient
      fullName={profile?.full_name || ""}
      exams={fetchedExams}
      submissions={submissions}
      totalStudents={totalStudents}
      stats={{
        examsCreatedThisWeek,
        newSubmissionsCount,
        activeStudentsThisWeek,
        activeStudentsPercent,
        averageScore,
      }}
      dailyActivityData={dailyActivityData}
      scoreDistribution={scoreDistribution}
    />
  )
}
