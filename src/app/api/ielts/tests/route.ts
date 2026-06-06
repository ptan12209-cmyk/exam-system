import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { STANDARD_DURATIONS } from '@/lib/ielts'
import { IeltsSkill, IeltsTestStatus } from '@/types'

// GET /api/ielts/tests
// Hỗ trợ tham số query: skill, status
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Lấy role của user
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isStudent = profile?.role === 'student'

  const skill = request.nextUrl.searchParams.get('skill') as IeltsSkill | null
  const status = request.nextUrl.searchParams.get('status') as IeltsTestStatus | null

  let query = supabase.from('ielts_tests').select('*')

  if (skill) {
    query = query.eq('skill', skill)
  }

  if (isStudent) {
    // Học sinh chỉ được xem các bài test đã xuất bản
    query = query.eq('status', 'published')
  } else if (status) {
    // Giáo viên có thể lọc theo status
    query = query.eq('status', status)
  }

  const { data: tests, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  return NextResponse.json(successResponse(tests || []))
}

// POST /api/ielts/tests
// Tạo mới đề thi IELTS (Dành cho giáo viên/admin)
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  const { title, description, skill, timer_mode, duration, status } = body as {
    title: string
    description?: string
    skill: IeltsSkill
    timer_mode: 'standard' | 'custom'
    duration?: number
    status?: IeltsTestStatus
  }

  // 1. Validate đầu vào
  if (!title?.trim()) {
    throw new ApiError('BAD_REQUEST', 'Tiêu đề bài thi không được để trống', 400)
  }

  if (!skill || !['reading', 'listening', 'writing'].includes(skill)) {
    throw new ApiError('BAD_REQUEST', 'Kỹ năng IELTS không hợp lệ', 400)
  }

  if (timer_mode && !['standard', 'custom'].includes(timer_mode)) {
    throw new ApiError('BAD_REQUEST', 'Chế độ thời gian không hợp lệ', 400)
  }

  // 2. Tính toán duration dựa trên timer_mode
  let finalDuration = STANDARD_DURATIONS[skill]
  const mode = timer_mode || 'standard'

  if (mode === 'custom') {
    if (!duration || duration <= 0) {
      throw new ApiError('BAD_REQUEST', 'Thời gian thi tùy chỉnh phải lớn hơn 0 phút', 400)
    }
    finalDuration = duration
  }

  // 3. Insert bài test mới
  const { data: newTest, error } = await supabase
    .from('ielts_tests')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      skill,
      timer_mode: mode,
      duration: finalDuration,
      status: status || 'draft',
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(successResponse(newTest))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
