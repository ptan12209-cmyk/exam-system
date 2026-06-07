import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { correctCountToBand } from '@/lib/ielts'

// POST /api/ielts/submit
// Nộp bài làm IELTS của học sinh
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { test_id, answers, writing_response, time_spent } = body as {
    test_id: string
    answers?: Array<{ question_id: string; answer: string }> // [{question_id, answer}]
    writing_response?: string
    time_spent: number // tính bằng giây
  }

  // 1. Validate đầu vào
  if (!test_id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID bài thi (test_id)', 400)
  }

  const { data: test, error: findTestError } = await supabase
    .from('ielts_tests')
    .select('id, skill, total_questions')
    .eq('id', test_id)
    .single()

  if (findTestError || !test) {
    throw new ApiError('NOT_FOUND', 'Bài thi không tồn tại', 404)
  }

  // Kiểm tra student đã có submission chưa hoàn thành
  const { data: existing } = await supabase
    .from('ielts_submissions')
    .select('id, status')
    .eq('test_id', test_id)
    .eq('student_id', user.id)
    .in('status', ['submitted', 'graded'])

  if (existing && existing.length > 0) {
    // Cho phép làm lại (tạo submission mới) nhưng log warning
    console.warn(`Student ${user.id} đã có ${existing.length} submission(s) cho test ${test_id}`)
  }

  const studentAnswers = answers || []
  let correctCount = 0
  let score: number | null = null
  let bandScore: number | null = null
  let status = 'submitted'
  const finalTimeSpent = time_spent || 0

  // 2. Chấm điểm Reading & Listening
  if (test.skill === 'reading' || test.skill === 'listening') {
    // Lấy danh sách đáp án đúng từ DB
    const { data: sections } = await supabase
      .from('ielts_sections')
      .select('id')
      .eq('test_id', test_id)

    if (!sections || sections.length === 0) {
      throw new ApiError('BAD_REQUEST', 'Đề thi không có phần thi nào', 400)
    }

    const sectionIds = sections.map((s: any) => s.id)

    const { data: questions, error: questionsError } = await supabase
      .from('ielts_questions')
      .select('id, correct_answer')
      .in('section_id', sectionIds)

    if (questionsError) throw questionsError

    const dbQuestions = questions || []
    const totalQs = dbQuestions.length

    // So khớp câu trả lời
    dbQuestions.forEach(q => {
      const studentAns = studentAnswers.find(sa => sa.question_id === q.id)
      if (studentAns && studentAns.answer) {
        const saClean = studentAns.answer.trim().toLowerCase()
        const dbClean = q.correct_answer.trim().toLowerCase()
        
        // So khớp trực tiếp (case-insensitive)
        if (saClean === dbClean) {
          correctCount++
        }
      }
    })

    // Tính band score
    bandScore = correctCountToBand(correctCount, test.skill)
    score = bandScore
    status = 'graded' // Reading & Listening được graded ngay
  } else if (test.skill === 'writing') {
    // Với Writing, lưu bài viết và chờ AI chấm điểm
    if (!writing_response?.trim()) {
      throw new ApiError('BAD_REQUEST', 'Nội dung bài viết không được để trống', 400)
    }
    status = 'submitted' // Sẽ đổi sang 'graded' sau khi AI chấm xong
  }

  // 3. Lưu submission
  const { data: submission, error: submitError } = await supabase
    .from('ielts_submissions')
    .insert({
      test_id,
      student_id: user.id,
      answers: studentAnswers,
      writing_response: writing_response || null,
      score,
      correct_count: test.skill !== 'writing' ? correctCount : 0,
      total_questions: test.skill !== 'writing' ? test.total_questions : 0,
      band_score: bandScore,
      time_spent: finalTimeSpent,
      submitted_at: new Date().toISOString(),
      status
    })
    .select()
    .single()

  if (submitError) throw submitError

  return NextResponse.json(
    successResponse({
      submission_id: submission.id,
      status: submission.status,
      correct_count: submission.correct_count,
      total_questions: submission.total_questions,
      band_score: submission.band_score,
      score: submission.score
    })
  )
}

export const POST = withErrorHandler(handlePOST)
