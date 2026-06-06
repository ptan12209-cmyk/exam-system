import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'

// POST /api/ielts/sections
// Thêm section mới vào bài test (Dành cho giáo viên/admin)
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  const {
    test_id,
    title,
    order_index,
    passage_content,
    audio_url,
    audio_source,
    writing_prompt,
    writing_task_type,
    writing_image_url,
    min_words
  } = body as {
    test_id: string
    title: string
    order_index?: number
    passage_content?: string
    audio_url?: string
    audio_source?: 'upload' | 'youtube' | 'external'
    writing_prompt?: string
    writing_task_type?: 'task1' | 'task2'
    writing_image_url?: string
    min_words?: number
  }

  // 1. Validate
  if (!test_id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID bài thi (test_id)', 400)
  }
  if (!title?.trim()) {
    throw new ApiError('BAD_REQUEST', 'Tiêu đề phần không được để trống', 400)
  }

  // Check test existence
  const { data: test, error: testError } = await supabase
    .from('ielts_tests')
    .select('id, skill')
    .eq('id', test_id)
    .single()

  if (testError || !test) {
    throw new ApiError('NOT_FOUND', 'Bài thi không tồn tại', 404)
  }

  // Validate fields based on test skill
  if (test.skill === 'reading' && !passage_content?.trim()) {
    throw new ApiError('BAD_REQUEST', 'Bài đọc Reading yêu cầu nội dung văn bản (passage_content)', 400)
  }
  
  if (test.skill === 'listening' && audio_source && !['upload', 'youtube', 'external'].includes(audio_source)) {
    throw new ApiError('BAD_REQUEST', 'Nguồn âm thanh Listening không hợp lệ', 400)
  }

  if (test.skill === 'writing') {
    if (writing_task_type && !['task1', 'task2'].includes(writing_task_type)) {
      throw new ApiError('BAD_REQUEST', 'Loại Task Writing không hợp lệ', 400)
    }
  }

  // 2. Insert section
  const { data: section, error } = await supabase
    .from('ielts_sections')
    .insert({
      test_id,
      title: title.trim(),
      order_index: order_index || 1,
      passage_content: passage_content || null,
      audio_url: audio_url || null,
      audio_source: audio_source || null,
      writing_prompt: writing_prompt || null,
      writing_task_type: writing_task_type || null,
      writing_image_url: writing_image_url || null,
      min_words: min_words || null
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(successResponse(section))
}

// PUT /api/ielts/sections
// Cập nhật section (Dành cho giáo viên/admin)
async function handlePUT(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const body = await request.json()
  const {
    id,
    title,
    order_index,
    passage_content,
    audio_url,
    audio_source,
    writing_prompt,
    writing_task_type,
    writing_image_url,
    min_words
  } = body as {
    id: string
    title?: string
    order_index?: number
    passage_content?: string
    audio_url?: string
    audio_source?: 'upload' | 'youtube' | 'external'
    writing_prompt?: string
    writing_task_type?: 'task1' | 'task2'
    writing_image_url?: string
    min_words?: number
  }

  if (!id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID phần cần cập nhật (id)', 400)
  }

  // Check section existence
  const { data: existingSection, error: findError } = await supabase
    .from('ielts_sections')
    .select('id, test_id')
    .eq('id', id)
    .single()

  if (findError || !existingSection) {
    throw new ApiError('NOT_FOUND', 'Phần cần cập nhật không tồn tại', 404)
  }

  // Prepare fields to update
  const updates: Record<string, any> = {}
  if (title !== undefined) {
    if (!title.trim()) {
      throw new ApiError('BAD_REQUEST', 'Tiêu đề không được để trống', 400)
    }
    updates.title = title.trim()
  }
  if (order_index !== undefined) updates.order_index = order_index
  if (passage_content !== undefined) updates.passage_content = passage_content || null
  if (audio_url !== undefined) updates.audio_url = audio_url || null
  if (audio_source !== undefined) {
    if (audio_source && !['upload', 'youtube', 'external'].includes(audio_source)) {
      throw new ApiError('BAD_REQUEST', 'Nguồn âm thanh không hợp lệ', 400)
    }
    updates.audio_source = audio_source || null
  }
  if (writing_prompt !== undefined) updates.writing_prompt = writing_prompt || null
  if (writing_task_type !== undefined) {
    if (writing_task_type && !['task1', 'task2'].includes(writing_task_type)) {
      throw new ApiError('BAD_REQUEST', 'Loại Task Writing không hợp lệ', 400)
    }
    updates.writing_task_type = writing_task_type || null
  }
  if (writing_image_url !== undefined) updates.writing_image_url = writing_image_url || null
  if (min_words !== undefined) updates.min_words = min_words || null

  const { data: updatedSection, error: updateError } = await supabase
    .from('ielts_sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) throw updateError

  return NextResponse.json(successResponse(updatedSection))
}

// DELETE /api/ielts/sections?id=section-uuid
// Xóa section (Dành cho giáo viên/admin)
async function handleDELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ['teacher', 'admin'])

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    throw new ApiError('BAD_REQUEST', 'Thiếu ID phần cần xóa (id)', 400)
  }

  // Check section existence
  const { data: existing, error: findError } = await supabase
    .from('ielts_sections')
    .select('id')
    .eq('id', id)
    .single()

  if (findError || !existing) {
    throw new ApiError('NOT_FOUND', 'Phần này không tồn tại hoặc đã bị xóa trước đó', 404)
  }

  const { error: deleteError } = await supabase
    .from('ielts_sections')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError

  return NextResponse.json(successResponse({ success: true }))
}

export const POST = withErrorHandler(handlePOST)
export const PUT = withErrorHandler(handlePUT)
export const DELETE = withErrorHandler(handleDELETE)
