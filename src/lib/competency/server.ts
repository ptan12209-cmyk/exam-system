import type { SupabaseClient } from "@supabase/supabase-js"
import { computeCompetency, type AttemptInput, type CompetencyResult } from "./engine"

/**
 * Server-side data layer for the competency engine.
 * Access rule: the teacher manages the student (parent_student_links) OR the
 * student has submitted to at least one exam owned by the teacher.
 */
export async function canTeacherViewStudent(
    supabase: SupabaseClient,
    teacherId: string,
    studentId: string
): Promise<boolean> {
    const { data: manages } = await supabase.rpc("manages_student", {
        p_student_id: studentId,
        p_manager_id: teacherId,
    })
    if (manages === true) return true

    const { data: examIds } = await supabase
        .from("exams")
        .select("id")
        .eq("teacher_id", teacherId)
    if (!examIds || examIds.length === 0) return false

    const { data: submission } = await supabase
        .from("submissions")
        .select("id")
        .eq("student_id", studentId)
        .in("exam_id", examIds.map((e) => e.id))
        .limit(1)

    return (submission?.length ?? 0) > 0
}

export interface StudentCompetencyProfile {
    id: string
    full_name: string | null
    class: string | null
    grade: number | null
}

/**
 * Fetch every attempt of the student on exams visible to this teacher and
 * run the competency engine. Returns null when access is denied or when the
 * student has no attempts at all (page still renders profile-only).
 */
export async function fetchStudentCompetency(
    supabase: SupabaseClient,
    teacherId: string,
    studentId: string
): Promise<{ profile: StudentCompetencyProfile; result: CompetencyResult } | null> {
    const allowed = await canTeacherViewStudent(supabase, teacherId, studentId)
    if (!allowed) return null

    const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, class, grade")
        .eq("id", studentId)
        .single()
    if (!profileData) return null

    // Join exams for subject + per-type totals. Keys are selected ONLY here
    // (server-side) to derive totals — they are never sent to the client.
    const { data: subsData } = await supabase
        .from("submissions")
        .select(`
            score,
            submitted_at,
            mc_correct,
            tf_correct,
            sa_correct,
            exam:exams!inner(id, title, subject, total_questions, mc_answers, tf_answers, sa_answers, correct_answers)
        `)
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: true })

    const rows = (subsData ?? []) as unknown as Array<{
        score: number
        submitted_at: string
        mc_correct: number | null
        tf_correct: number | null
        sa_correct: number | null
        exam: {
            id: string
            title: string
            subject: string
            total_questions: number
            mc_answers: { question: number }[] | null
            tf_answers: unknown[] | null
            sa_answers: unknown[] | null
            correct_answers: string[] | null
        }
    }>

    const attempts: AttemptInput[] = rows.map((row) => ({
        exam_id: row.exam.id,
        subject: row.exam.subject || "other",
        score: Number(row.score) || 0,
        submitted_at: row.submitted_at,
        mc_total:
            (Array.isArray(row.exam.mc_answers) ? row.exam.mc_answers.length : 0) ||
            (Array.isArray(row.exam.correct_answers) ? row.exam.correct_answers.length : 0) ||
            null,
        mc_correct: row.mc_correct,
        tf_total: Array.isArray(row.exam.tf_answers) ? row.exam.tf_answers.length : 0,
        tf_correct: row.tf_correct,
        sa_total: Array.isArray(row.exam.sa_answers) ? row.exam.sa_answers.length : 0,
        sa_correct: row.sa_correct,
    }))

    return {
        profile: {
            id: profileData.id,
            full_name: profileData.full_name,
            class: profileData.class,
            grade: profileData.grade,
        },
        result: computeCompetency(attempts),
    }
}
