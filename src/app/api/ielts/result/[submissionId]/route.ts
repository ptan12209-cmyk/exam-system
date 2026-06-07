import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'

// GET /api/ielts/result/[submissionId]
// Trả về chi tiết bài thi + kết quả + đáp án đúng cho học sinh và giáo viên
async function handleGET(
  request: NextRequest,
  props: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await props.params
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // 1. Tải chi tiết bài làm kèm theo thông tin đề thi
  const { data: sub, error: subError } = await supabase
    .from('ielts_submissions')
    .select('*, ielts_tests(*)')
    .eq('id', submissionId)
    .single()

  if (subError || !sub) {
    throw new ApiError('NOT_FOUND', 'Không tìm thấy bài làm trong hệ thống', 404)
  }

  // 2. Kiểm tra quyền sở hữu bài thi
  if (sub.student_id !== user.id) {
    // Nếu không phải chính học sinh sở hữu bài làm, kiểm tra xem có phải giáo viên/admin hay không
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      throw new ApiError('FORBIDDEN', 'Bạn không có quyền truy cập kết quả này', 403)
    }
  }

  // 3. Bảo vệ: Nếu bài thi chưa được nộp (vẫn đang làm), không cho phép xem đáp án
  if (sub.status === 'in_progress') {
    throw new ApiError('FORBIDDEN', 'Bài thi đang trong tiến trình làm bài, không thể xem đáp án', 403)
  }

  // 4. Lấy danh sách các sections của bài test
  const { data: sections, error: sectionsError } = await supabase
    .from('ielts_sections')
    .select('*')
    .eq('test_id', sub.test_id)
    .order('order_index', { ascending: true })

  if (sectionsError) throw sectionsError

  let assembledSections = sections || []

  // 5. Vì bài thi đã nộp thành công, chúng ta trả về các câu hỏi CÓ KÈM đáp án đúng và giải thích
  if (sub.ielts_tests?.skill !== 'writing' && assembledSections.length > 0) {
    const sectionIds = assembledSections.map(s => s.id)
    const { data: questions, error: questionsError } = await supabase
      .from('ielts_questions')
      .select('*')
      .in('section_id', sectionIds)
      .order('question_number', { ascending: true })

    if (questionsError) throw questionsError

    assembledSections = assembledSections.map(section => {
      const sectionQuestions = (questions || []).filter(q => q.section_id === section.id)
      return {
        ...section,
        questions: sectionQuestions
      }
    })
  }

  // 6. Tải kết quả chấm Writing của AI nếu có
  let wScore = null
  if (sub.ielts_tests?.skill === 'writing') {
    const { data: writingScore } = await supabase
      .from('ielts_writing_scores')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()

    wScore = writingScore
  }

  return NextResponse.json(
    successResponse({
      submission: sub,
      sections: assembledSections,
      writing_score: wScore
    })
  )
}

export const GET = withErrorHandler(handleGET)
