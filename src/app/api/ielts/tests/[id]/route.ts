import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { STANDARD_DURATIONS } from '@/lib/ielts'
import { IeltsSkill, IeltsTestStatus } from '@/types'

// GET /api/ielts/tests/[id]
// Lấy chi tiết đề thi kèm sections và questions (ẩn đáp án nếu là học sinh)
async function handleGET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // 1. Lấy role của user
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isStudent = profile?.role === 'student'

  // 2. Lấy thông tin bài test
  const { data: test, error: testError } = await supabase
    .from('ielts_tests')
    .select('*')
    .eq('id', id)
    .single()

  if (testError || !test) {
    throw new ApiError('NOT_FOUND', 'Bài thi không tồn tại', 404)
  }

  // Nếu học sinh truy cập bài test chưa xuất bản -> lỗi 403
  if (isStudent && test.status !== 'published') {
    throw new ApiError('FORBIDDEN', 'Bài thi này chưa được xuất bản', 403)
  }

  // 3. Lấy danh sách các sections của bài test
  const { data: sections, error: sectionsError } = await supabase
    .from('ielts_sections')
    .select('*')
    .eq('test_id', id)
    .order('order_index', { ascending: true })

  if (sectionsError) throw sectionsError

  let assembledSections = sections || []

  // 4. Nếu kỹ năng là Reading/Listening, lấy các câu hỏi cho từng section
  if (test.skill !== 'writing' && assembledSections.length > 0) {
    const sectionIds = assembledSections.map(s => s.id)
    const { data: questions, error: questionsError } = await supabase
      .from('ielts_questions')
      .select('*')
      .in('section_id', sectionIds)
      .order('question_number', { ascending: true })

    if (questionsError) throw questionsError

    assembledSections = assembledSections.map(section => {
      let sectionQuestions = (questions || []).filter(q => q.section_id === section.id)
      
      // Nếu là học sinh, ẩn đáp án và giải thích
      if (isStudent) {
        sectionQuestions = sectionQuestions.map(q => {
          const { correct_answer, explanation, ...publicFields } = q
          return {
            ...publicFields,
            correct_answer: '', // Ẩn đáp án
            explanation: null   // Ẩn giải thích
          } as any
        })
      }

      return {
        ...section,
        questions: sectionQuestions
      }
    })
  }

  return NextResponse.json(
    successResponse({
      ...test,
      sections: assembledSections
    })
  )
}

// PUT /api/ielts/tests/[id]
// Cập nhật thông tin bài test (Dành cho giáo viên/admin)
async function handlePUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  const { title, description, timer_mode, duration, status } = body as {
    title?: string
    description?: string
    timer_mode?: 'standard' | 'custom'
    duration?: number
    status?: IeltsTestStatus
  }

  // 1. Kiểm tra bài test tồn tại
  const { data: test, error: findError } = await supabase
    .from('ielts_tests')
    .select('*')
    .eq('id', id)
    .single()

  if (findError || !test) {
    throw new ApiError('NOT_FOUND', 'Bài thi không tồn tại', 404)
  }

  // 2. Chuẩn bị các trường thay đổi
  const updates: Record<string, any> = {}
  if (title !== undefined) {
    if (!title.trim()) {
      throw new ApiError('BAD_REQUEST', 'Tiêu đề không được để trống', 400)
    }
    updates.title = title.trim()
  }
  
  if (description !== undefined) {
    updates.description = description.trim() || null
  }

  if (timer_mode !== undefined) {
    if (!['standard', 'custom'].includes(timer_mode)) {
      throw new ApiError('BAD_REQUEST', 'Chế độ thời gian không hợp lệ', 400)
    }
    updates.timer_mode = timer_mode
    
    if (timer_mode === 'standard') {
      updates.duration = STANDARD_DURATIONS[test.skill as IeltsSkill]
    }
  }

  if (duration !== undefined && (timer_mode === 'custom' || test.timer_mode === 'custom')) {
    if (duration <= 0) {
      throw new ApiError('BAD_REQUEST', 'Thời gian thi tùy chỉnh phải lớn hơn 0', 400)
    }
    updates.duration = duration
  }

  if (status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new ApiError('BAD_REQUEST', 'Trạng thái bài thi không hợp lệ', 400)
    }
    updates.status = status
  }

  // 3. Thực hiện update
  const { data: updatedTest, error: updateError } = await supabase
    .from('ielts_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

  return NextResponse.json(successResponse(updatedTest))
}

// DELETE /api/ielts/tests/[id]
// Xóa bài test (Dành cho giáo viên/admin)
async function handleDELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  // 1. Kiểm tra tồn tại
  const { data: test, error: findError } = await supabase
    .from('ielts_tests')
    .select('id')
    .eq('id', id)
    .single()

  if (findError || !test) {
    throw new ApiError('NOT_FOUND', 'Bài thi không tồn tại', 404)
  }

  // 2. Thực hiện xóa
  const { error: deleteError } = await supabase
    .from('ielts_tests')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError

  return NextResponse.json(successResponse({ success: true }))
}

export const GET = withErrorHandler(handleGET)
export const PUT = withErrorHandler(handlePUT)
export const DELETE = withErrorHandler(handleDELETE)
