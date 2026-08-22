/**
 * RLS regression tests — chạy với tài khoản HỌC SINH thật để chứng minh:
 *  1. Không đọc được cột đáp án của bảng exams
 *  2. Không đọc được correct_answer/explanation của bảng questions
 *  3. Không tự INSERT được submission (giả mạo điểm)
 *  4. Không UPDATE/DELETE được submission (sửa điểm sau khi chấm)
 *  5. View an toàn exams_public/questions_public vẫn hoạt động
 *
 * Yêu cầu: .env.local có NEXT_PUBLIC_SUPABASE_URL + ANON_KEY,
 * E2E_STUDENT_EMAIL/E2E_STUDENT_PASSWORD. Bỏ qua khi thiếu.
 */
import { test, expect } from "@playwright/test"
import dotenv from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

dotenv.config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.E2E_STUDENT_EMAIL
const password = process.env.E2E_STUDENT_PASSWORD

const run = Boolean(url && anonKey && email && password)
test.skip(!run, "E2E student credentials / Supabase env not configured")

test.describe("RLS: student cannot reach answer keys", () => {
  let supabase: SupabaseClient

  test.beforeAll(async () => {
    supabase = createClient(url!, anonKey!) as unknown as SupabaseClient
    const { error } = await supabase.auth.signInWithPassword({
      email: email!,
      password: password!,
    })
    expect(error, "student login must succeed").toBeNull()
  })

  test("direct select of answer columns on exams is denied", async () => {
    const { data, error } = await supabase
      .from("exams")
      .select("id, title, correct_answers")
      .eq("status", "published")
      .limit(1)

    expect(error).toBeTruthy()
    expect(data).toBeNull()
  })

  test("any-column select on exams is denied for students (view is the only path)", async () => {
    const { error } = await supabase.from("exams").select("id").limit(1)
    expect(error).toBeTruthy()
  })

  test("questions.correct_answer / explanation are not readable", async () => {
    const { error } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer")
      .limit(1)
    expect(error).toBeTruthy()

    // Even selecting only safe columns fails — the base table is teacher-only.
    const safeAttempt = await supabase.from("questions").select("id").limit(1)
    expect(safeAttempt.error).toBeTruthy()
  })

  test("safe views remain readable and contain no answer columns", async () => {
    const { data: exams, error } = await supabase
      .from("exams_public")
      .select("*")
      .limit(1)
    expect(error).toBeNull()
    if (exams && exams.length > 0) {
      const row = exams[0] as Record<string, unknown>
      expect(row.correct_answers).toBeUndefined()
      expect(row.mc_answers).toBeUndefined()
      expect(row.tf_answers).toBeUndefined()
      expect(row.sa_answers).toBeUndefined()
      expect(row.answer_key).toBeUndefined()
      expect(row.questions).toBeUndefined()
    }

    const { data: questions, error: qError } = await supabase
      .from("questions_public")
      .select("*")
      .limit(1)
    expect(qError).toBeNull()
    if (questions && questions.length > 0) {
      const row = questions[0] as Record<string, unknown>
      expect(row.correct_answer).toBeUndefined()
      expect(row.explanation).toBeUndefined()
    }
  })

  test("forged submission INSERT with score=10 is rejected", async () => {
    const { data: { user } } = await supabase.auth.getUser()
    expect(user).toBeTruthy()

    const { data: exam } = await supabase
      .from("exams_public")
      .select("id")
      .limit(1)
    const examId = exam?.[0]?.id ?? crypto.randomUUID()

    const { error } = await supabase.from("submissions").insert({
      exam_id: examId,
      student_id: user!.id,
      score: 10,
      is_ranked: true,
      attempt_number: 99,
    })
    expect(error).toBeTruthy()
  })

  test("UPDATE own submissions (score tampering) is rejected", async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from("submissions")
      .update({ score: 10 })
      .eq("student_id", user!.id)
    // Either zero rows matched (no submissions) or permission denied — but a
    // successful update must never happen.
    expect(error).toBeTruthy()
  })

  test("DELETE own submissions is rejected", async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("student_id", user!.id)
    expect(error).toBeTruthy()
  })

  test("get_graded_exam_for_student returns no answers without a submission", async () => {
    // Pick any published exam; if this account has submitted to it the RPC may
    // return data — so assert only that a NON-submitted exam yields null.
    const { data: { user } } = await supabase.auth.getUser()
    const { data: submitted } = await supabase
      .from("submissions")
      .select("exam_id")
      .eq("student_id", user!.id)
    const submittedIds = new Set((submitted ?? []).map((s) => s.exam_id))

    const { data: exams } = await supabase
      .from("exams_public")
      .select("id")
      .limit(50)
    const target = (exams ?? []).find((e) => !submittedIds.has(e.id))
    test.skip(!target, "this account has submitted to every published exam")

    const { data } = await supabase.rpc("get_graded_exam_for_student", {
      exam_uuid: target!.id,
    })
    expect(data).toBeNull()
  })
})
