import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, successResponse } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-utils';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

async function handleGET(request: Request) {
  const supabase = await createClient();
  const user = await requireAuth(supabase);

  // Rate limit
  const clientIP = getClientIP(request);
  const { allowed, remaining, reset } = await checkRateLimit(`sr-stats:${clientIP}`, 60, 60);
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

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const nowISO = now.toISOString();

  // total_cards
  const { count: totalCards } = await supabase
    .from('spaced_repetition_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // due_today
  const { count: dueToday } = await supabase
    .from('spaced_repetition_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .lte('next_review_date', nowISO);

  // reviewed_today
  const { count: reviewedToday } = await supabase
    .from('spaced_repetition_cards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('last_review_date', todayStart);

  // streak_days: count consecutive days with reviews going back from today
  let streakDays = 0;
  const checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let hasReview = true;

  while (hasReview) {
    const dayStart = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate()
    ).toISOString();
    const dayEnd = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate(),
      23,
      59,
      59,
      999
    ).toISOString();

    const { count } = await supabase
      .from('spaced_repetition_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('last_review_date', dayStart)
      .lte('last_review_date', dayEnd);

    if (count && count > 0) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      hasReview = false;
    }

    // Safety cap to prevent infinite loops
    if (streakDays > 365) break;
  }

  const response = NextResponse.json(
    successResponse({
      total_cards: totalCards || 0,
      due_today: dueToday || 0,
      reviewed_today: reviewedToday || 0,
      streak_days: streakDays,
    })
  );
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  return response;
}

/**
 * GET /api/spaced-repetition/stats
 * Returns spaced-repetition statistics: total cards, due today, reviewed today, and current streak.
 * Auth: Required.
 * Rate limit: per IP.
 */
export const GET = withErrorHandler(handleGET);
