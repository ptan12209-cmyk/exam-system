import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, successResponse, ApiError } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { z } from 'zod';
import { calculateNextReview } from '@/lib/spaced-repetition';

async function handlePOST(request: Request) {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Rate limit
  const clientIP = getClientIP(request);
  const { allowed, remaining, reset } = await checkRateLimit(`sr-review:${clientIP}`, 60, 60);
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
  const reviewSchema = z.object({
    card_id: z.string().min(1, 'card_id is required'),
    quality: z.number().int().min(0).max(5, 'quality must be 0-5'),
  });

  let body: z.infer<typeof reviewSchema>;
  try {
    body = reviewSchema.parse(await request.json());
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Validation failed', 400);
    }
    throw validationError;
  }

  const { card_id, quality } = body;

  // Fetch current card
  const { data: card, error: fetchError } = await supabase
    .from('spaced_repetition_cards')
    .select('*')
    .eq('id', card_id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !card) {
    throw new ApiError('CARD_NOT_FOUND', 'Spaced repetition card not found', 404);
  }

  // Calculate next review
  const updated = calculateNextReview(
    {
      ease_factor: card.ease_factor,
      interval_days: card.interval_days,
      repetitions: card.repetitions,
    },
    quality
  );

  // Update DB
  const { data: updatedCard, error: updateError } = await supabase
    .from('spaced_repetition_cards')
    .update({
      ease_factor: updated.ease_factor,
      interval_days: updated.interval_days,
      repetitions: updated.repetitions,
      next_review_date: updated.next_review_date,
      last_review_date: new Date().toISOString(),
    })
    .eq('id', card_id)
    .select('*')
    .single();

  if (updateError) {
    console.error('Spaced repetition review update error:', updateError);
    throw new ApiError('REVIEW_UPDATE_FAILED', 'Failed to update review', 500);
  }

  return NextResponse.json(successResponse({ card: updatedCard }));
}

/**
 * POST /api/spaced-repetition/review
 * Submits a review for a spaced-repetition card, updating ease factor, interval, and next review date.
 * Auth: Required.
 * Rate limit: per IP.
 */
export const POST = withErrorHandler(handlePOST);
