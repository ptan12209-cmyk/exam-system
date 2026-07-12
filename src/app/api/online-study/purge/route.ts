import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils'
import { checkRateLimit, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import {
  purgeOnlineStudyItems,
  type PurgePayload,
} from '@/lib/online-study-purge'
import { createHash, timingSafeEqual } from 'crypto'

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) {
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
 * POST /api/online-study/purge
 * Machine purge of lessons when Drive files are confirmed deleted.
 * Auth: same ONLINE_STUDY_IMPORT_SECRET as import.
 */
async function handlePOST(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = await checkRateLimit(`online-purge:${ip}`, 60, 60)
  if (!rl.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 60,
      remaining: rl.remaining,
      resetTime: rl.reset * 1000,
    })
  }

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

  const body = (await request.json()) as PurgePayload
  const driveFileIds = Array.isArray(body?.driveFileIds) ? body.driveFileIds : []
  const remotePaths = Array.isArray(body?.remotePaths) ? body.remotePaths : []
  if (!driveFileIds.length && !remotePaths.length) {
    throw new ApiError('BAD_REQUEST', 'driveFileIds[] or remotePaths[] required', 400)
  }
  if (driveFileIds.length + remotePaths.length > 500) {
    throw new ApiError('BAD_REQUEST', 'Max 500 ids/paths per batch', 400)
  }

  const admin = createAdminClient()
  const result = await purgeOnlineStudyItems(admin, {
    courseKey: body.courseKey,
    driveFileIds,
    remotePaths,
    deleteEmptyFolders: body.deleteEmptyFolders !== false,
  })

  return NextResponse.json(
    successResponse({
      ...result,
      ok: result.errors.length === 0,
    })
  )
}

export const POST = withErrorHandler(handlePOST)
