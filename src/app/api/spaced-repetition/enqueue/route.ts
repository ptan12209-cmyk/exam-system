import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { z } from 'zod';
import { enqueueWrongAnswers } from '@/lib/spaced-repetition';

async function handlePOST(request: Request) {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Rate limit
  const clientIP = getClientIP(request);
  const { allowed, remaining, reset } = await checkRateLimit(`sr-enqueue:${clientIP}`, 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(60),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.ceil(reset - Date.now()/1000)),
      },
    });
  }

  // Zod validation
  const enqueueSchema = z.object({
    exam_id: z.string().min(1, 'exam_id is required'),
    wrong_question_ids: z.array(z.string().min(1)).min(1, 'At least one question ID is required'),
  });

  let body: z.infer<typeof enqueueSchema>;
  try {
    body = enqueueSchema.parse(await request.json());
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Validation failed', 400);
    }
    throw validationError;
  }

  const { exam_id, wrong_question_ids } = body;

  const enqueued = await enqueueWrongAnswers(supabase, user.id, exam_id, wrong_question_ids);

  return NextResponse.json(successResponse({ enqueued }));
}

/**
 * POST /api/spaced-repetition/enqueue
 * Enqueues wrong answers from an exam for spaced-repetition review scheduling.
 * Auth: Required.
 * Rate limit: per IP.
 */
export const POST = withErrorHandler(handlePOST);
