import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { IeltsQuestionType } from '@/types'

// Hàm cập nhật số lượng câu hỏi trong bảng ielts_tests
async function updateTestQuestionCount(supabase: any, testId: string) {
  // Lấy danh sách sectionIds của test
  const { data: sections } = await supabase
    .from('ielts_sections')
    .select('id')
    .eq('test_id', testId)

  if (!sections || sections.length === 0) {
    await supabase.from('ielts_tests').update({ total_questions: 0 }).eq('id', testId)
    return
  }

  const sectionIds = sections.map((s: any) => s.id)

  // Đếm tổng số câu hỏi
  const { count, error } = await supabase
    .from('ielts_questions')
    .select('*', { count: 'exact', head: true })
    .in('section_id', sectionIds)

  if (!error && count !== null) {
    await supabase.from('ielts_tests').update({ total_questions: count }).eq('id', testId)
  }
}

// POST /api/ielts/questions
// Thêm câu hỏi (hoặc danh sách câu hỏi) vào section
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  
  // Hỗ trợ bulk insert (dạng mảng) hoặc single insert
  const isArray = Array.isArray(body)
  const questionsToInsert = isArray ? body : [body]

  if (questionsToInsert.length === 0) {
    throw new ApiError('BAD_REQUEST', 'Danh sách câu hỏi trống', 400)
  }

  const firstQuestion = questionsToInsert[0]
  const sectionId = firstQuestion.section_id

  if (!sectionId) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID phần thi (section_id)', 400)
  }

  // Lấy thông tin section để biết test_id
  const { data: section, error: findSectionError } = await supabase
    .from('ielts_sections')
    .select('id, test_id')
    .eq('id', sectionId)
    .single()

  if (findSectionError || !section) {
    throw new ApiError('NOT_FOUND', 'Phần thi không tồn tại', 404)
  }

  const validTypes: IeltsQuestionType[] = [
    'multiple_choice', 'true_false_ng', 'yes_no_ng', 'fill_blank',
    'matching', 'short_answer', 'sentence_completion', 'diagram_label', 'heading_match'
  ]

  // Validate các câu hỏi
  for (const q of questionsToInsert) {
    if (q.section_id !== sectionId) {
      throw new ApiError('BAD_REQUEST', 'Tất cả câu hỏi trong lô phải thuộc cùng một section_id', 400)
    }
    if (!q.question_number || q.question_number <= 0) {
      throw new ApiError('BAD_REQUEST', 'Số thứ tự câu hỏi không hợp lệ', 400)
    }
    if (!q.question_type || !validTypes.includes(q.question_type)) {
      throw new ApiError('BAD_REQUEST', `Loại câu hỏi ${q.question_type} không hợp lệ`, 400)
    }
    if (!q.question_text?.trim()) {
      throw new ApiError('BAD_REQUEST', 'Nội dung câu hỏi không được để trống', 400)
    }
    if (q.correct_answer === undefined || q.correct_answer === null) {
      throw new ApiError('BAD_REQUEST', 'Đáp án đúng không được để trống', 400)
    }
  }

  // Thực hiện insert
  const insertData = questionsToInsert.map(q => ({
    section_id: q.section_id,
    question_number: q.question_number,
    question_type: q.question_type,
    question_text: q.question_text.trim(),
    options: q.options || null,
    correct_answer: String(q.correct_answer).trim(),
    explanation: q.explanation?.trim() || null
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('ielts_questions')
    .insert(insertData)
    .select()

  if (insertError) {
    // Có thể bị trùng UNIQUE(section_id, question_number)
    if (insertError.code === '23505') {
      throw new ApiError('CONFLICT', 'Số thứ tự câu hỏi đã tồn tại trong phần thi này', 409)
    }
    throw insertError
  }

  // Cập nhật lại tổng số câu hỏi của bài thi
  await updateTestQuestionCount(supabase, section.test_id)

  return NextResponse.json(successResponse(isArray ? inserted : inserted[0]))
}

// PUT /api/ielts/questions
// Cập nhật câu hỏi (Dành cho giáo viên/admin)
async function handlePUT(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  const {
    id,
    question_number,
    question_type,
    question_text,
    options,
    correct_answer,
    explanation
  } = body as {
    id: string
    question_number?: number
    question_type?: IeltsQuestionType
    question_text?: string
    options?: any
    correct_answer?: string
    explanation?: string
  }

  if (!id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID câu hỏi cần cập nhật (id)', 400)
  }

  // Check question existence
  const { data: existingQ, error: findError } = await supabase
    .from('ielts_questions')
    .select('id, section_id, ielts_sections(test_id)')
    .eq('id', id)
    .single()

  if (findError || !existingQ) {
    throw new ApiError('NOT_FOUND', 'Câu hỏi không tồn tại', 404)
  }

  const updates: Record<string, any> = {}
  if (question_number !== undefined) {
    if (question_number <= 0) {
      throw new ApiError('BAD_REQUEST', 'Số thứ tự câu hỏi phải lớn hơn 0', 400)
    }
    updates.question_number = question_number
  }
  
  if (question_type !== undefined) {
    const validTypes = [
      'multiple_choice', 'true_false_ng', 'yes_no_ng', 'fill_blank',
      'matching', 'short_answer', 'sentence_completion', 'diagram_label', 'heading_match'
    ]
    if (!validTypes.includes(question_type)) {
      throw new ApiError('BAD_REQUEST', 'Loại câu hỏi không hợp lệ', 400)
    }
    updates.question_type = question_type
  }

  if (question_text !== undefined) {
    if (!question_text.trim()) {
      throw new ApiError('BAD_REQUEST', 'Nội dung câu hỏi không được để trống', 400)
    }
    updates.question_text = question_text.trim()
  }

  if (options !== undefined) updates.options = options
  if (correct_answer !== undefined) {
    if (correct_answer === null || correct_answer === '') {
      throw new ApiError('BAD_REQUEST', 'Đáp án đúng không được để trống', 400)
    }
    updates.correct_answer = String(correct_answer).trim()
  }
  if (explanation !== undefined) updates.explanation = explanation?.trim() || null

  const { data: updatedQ, error: updateError } = await supabase
    .from('ielts_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === '23505') {
      throw new ApiError('CONFLICT', 'Số thứ tự câu hỏi đã tồn tại trong phần thi này', 409)
    }
    throw updateError
  }

  return NextResponse.json(successResponse(updatedQ))
}

// DELETE /api/ielts/questions?id=question-uuid
// Xóa câu hỏi (Dành cho giáo viên/admin)
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID câu hỏi cần xóa (id)', 400)
  }

  // Check question existence to get test_id
  const { data: existingQ, error: findError } = await supabase
    .from('ielts_questions')
    .select('id, section_id, ielts_sections(test_id)')
    .eq('id', id)
    .single()

  if (findError || !existingQ) {
    throw new ApiError('NOT_FOUND', 'Câu hỏi không tồn tại hoặc đã bị xóa trước đó', 404)
  }

  const testId = (existingQ as any).ielts_sections?.test_id

  const { error: deleteError } = await supabase
    .from('ielts_questions')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError

  // Cập nhật lại tổng số câu hỏi của bài thi
  if (testId) {
    await updateTestQuestionCount(supabase, testId)
  }

  return NextResponse.json(successResponse({ success: true }))
}

export const POST = withErrorHandler(handlePOST)
export const PUT = withErrorHandler(handlePUT)
export const DELETE = withErrorHandler(handleDELETE)
