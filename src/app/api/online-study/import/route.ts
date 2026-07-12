import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import {
  importOnlineStudyItems,
  type ImportPayload,
} from '@/lib/online-study-import'
import { createHash, timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
      // hash both to constant-length compare
      const ha = createHash('sha256').update(a).digest()
      const hb = createHash('sha256').update(b).digest()
      return timingSafeEqual(ha, hb) && a === b
    }
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function extractImportSecret(request: NextRequest): string {
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return (
    request.headers.get('x-import-secret') ||
    request.headers.get('x-online-study-import-secret') ||
    ''
  ).trim()
}

/**
 * POST /api/online-study/import
 * Machine import from Drive downloader (Bunny URLs → online_lessons).
 * Auth: ONLINE_STUDY_IMPORT_SECRET via Bearer or X-Import-Secret.
 */
async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = checkRateLimit(`online-import:${ip}`, 30, 60_000)
  if (!rl.success) return rateLimitResponse(rl)

  const expected = String(process.env.ONLINE_STUDY_IMPORT_SECRET || '').trim()
  if (!expected) {
    throw new ApiError(
      'CONFIG',
      'ONLINE_STUDY_IMPORT_SECRET is not configured on ExamHub',
      503
    )
  }

  const provided = extractImportSecret(request)
  if (!provided || !safeEqual(provided, expected)) {
    throw new ApiError('UNAUTHORIZED', 'Invalid import secret', 401)
  }

  const body = (await request.json()) as ImportPayload
  if (!body || !body.courseKey || !body.subject) {
    throw new ApiError('BAD_REQUEST', 'courseKey and subject are required', 400)
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new ApiError('BAD_REQUEST', 'items[] is required', 400)
  }
  if (body.items.length > 500) {
    throw new ApiError('BAD_REQUEST', 'Max 500 items per batch', 400)
  }

  const admin = createAdminClient()
  const result = await importOnlineStudyItems(admin, body)

  return NextResponse.json(
    successResponse({
      ...result,
      ok: result.errors.length === 0,
    })
  )
}

export const POST = withErrorHandler(handlePOST)
