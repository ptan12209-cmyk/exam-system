import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import { TeacherExamsClient } from "./TeacherExamsClient"
import type { Exam } from "@/types"

/**
 * Server Component — the exam list (with submission counts) arrives
 * pre-rendered; filters/delete live in TeacherExamsClient.
 */
export default async function TeacherExamsPage() {
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

  const exams = ((examsResult.data ?? []).map((e: Record<string, unknown>) => ({
    ...e,
    submission_count: Array.isArray(e.submissions) && e.submissions.length
      ? (e.submissions as { count: number }[])[0].count
      : 0,
  }))) as unknown as Exam[]

  return <TeacherExamsClient fullName={profile?.full_name || ""} exams={exams} />
}
