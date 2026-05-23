import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api-utils';
import { requireAuth, requireRole } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { ParentServerService } from '@/services/parent-server';

/**
 * GET /api/parent/children
 *
 * Returns the authenticated parent's linked children with their exam progress stats.
 * Auth: Required (parent role only).
 * Rate limit: 30 requests per minute per authenticated user.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleGET(_request: Request) {
  const supabase = await createClient();

  const user = await requireAuth(supabase);
  await requireRole(supabase, user.id, ['parent']);

  // Rate limit: 30 req/min per parent user
  const rateResult = await checkRateLimit(`parent-children:${user.id}`, 30, 60);
  if (!rateResult.allowed) {
    const retryAfter = rateResult.reset - Math.floor(Date.now() / 1000);
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const service = new ParentServerService(supabase);

  const childrenList = await service.getChildren(user.id);

  const childrenWithStats = await Promise.all(
    childrenList.map(async (child) => {
      const stats = await service.getChildProgress(user.id, child.studentId);
      return {
        id: child.studentId,
        name: child.studentName,
        email: child.studentEmail,
        linkedAt: child.linkedAt,
        stats: {
          examsTaken: stats.examsTaken,
          avgScore: stats.avgScore,
          lastExamDate: stats.lastExamDate,
        },
      };
    })
  );

  const response = NextResponse.json({ children: childrenWithStats });
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  return response;
}

export const GET = withErrorHandler(handleGET);
