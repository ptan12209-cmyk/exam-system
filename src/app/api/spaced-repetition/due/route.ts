import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, successResponse } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { z } from 'zod';

async function handleGET(request: Request) {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Rate limit
  const clientIP = getClientIP(request);
  const { allowed, remaining, reset } = await checkRateLimit(`sr-due:${clientIP}`, 60, 60);
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

  // Parse query params
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit') ?? '10';
  const limitSchema = z.coerce.number().int().min(1).max(50);
  const limitResult = limitSchema.safeParse(limitParam);
  if (!limitResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: limitResult.error.format() },
      { status: 400 }
    );
  }
  const limit = limitResult.data;

  const now = new Date().toISOString();

  const { data: cards, error } = await supabase
    .from('spaced_repetition_cards')
    .select(
      `
      id,
      question_id,
      exam_id,
      ease_factor,
      interval_days,
      repetitions,
      next_review_date,
      questions (
        id,
        question_text,
        options,
        correct_answer
      )
    `
    )
    .eq('user_id', user.id)
    .lte('next_review_date', now)
    .order('next_review_date', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Spaced repetition due fetch error:', error);
    return NextResponse.json(successResponse({ cards: [] }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (cards || []).map((card: any) => {
    const question = Array.isArray(card.questions) ? card.questions[0] : card.questions;
    return {
      id: card.id,
      question_id: card.question_id,
      question_content: question?.question_text || '',
      options: question?.options || [],
      correct_answer: question?.correct_answer ?? 0,
      exam_id: card.exam_id,
      ease_factor: card.ease_factor,
      interval_days: card.interval_days,
      repetitions: card.repetitions,
      next_review_date: card.next_review_date,
    };
  });

  const response = NextResponse.json(successResponse({ cards: mapped }));
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  return response;
}

/**
 * GET /api/spaced-repetition/due
 * Fetches due spaced-repetition cards for the authenticated user, with optional limit.
 * Auth: Required.
 * Rate limit: per IP.
 */
export const GET = withErrorHandler(handleGET);
