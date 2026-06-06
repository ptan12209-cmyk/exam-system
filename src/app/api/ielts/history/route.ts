import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-utils'
import { withErrorHandler, successResponse } from '@/lib/api-utils'
import { IeltsSkill } from '@/types'

// GET /api/ielts/history
// Lấy lịch sử thi của học sinh hiện tại, lọc theo skill nếu có
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const skill = request.nextUrl.searchParams.get('skill') as IeltsSkill | null

  // Sử dụng inner join ielts_tests để lấy thông tin đề thi và lọc theo skill nếu cần
  let query = supabase
    .from('ielts_submissions')
    .select('*, ielts_tests!inner(title, skill, duration)')
    .eq('student_id', user.id)

  if (skill) {
    query = query.eq('ielts_tests.skill', skill)
  }

  const { data: submissions, error } = await query
    .order('submitted_at', { ascending: false })

  if (error) throw error

  // Flatten kết quả để frontend dễ sử dụng
  const formattedSubmissions = (submissions || []).map((sub: any) => ({
    id: sub.id,
    test_id: sub.test_id,
    test_title: sub.ielts_tests?.title,
    skill: sub.ielts_tests?.skill,
    duration: sub.ielts_tests?.duration,
    score: sub.score,
    correct_count: sub.correct_count,
    total_questions: sub.total_questions,
    band_score: sub.band_score,
    time_spent: sub.time_spent,
    started_at: sub.started_at,
    submitted_at: sub.submitted_at,
    status: sub.status
  }))

  return NextResponse.json(successResponse(formattedSubmissions))
}

export const GET = withErrorHandler(handleGET)
