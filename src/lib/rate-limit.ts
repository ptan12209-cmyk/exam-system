/**
 * Rate Limiter - hỗ trợ Upstash Redis (production) + In-memory Map (fallback/dev)
 *
 * Cấu hình Upstash Redis:
 *   Thêm vào .env:
 *     UPSTASH_REDIS_REST_URL="https://..."
 *     UPSTASH_REDIS_REST_TOKEN="..."
 *   Nếu không có, tự động dùng in-memory Map.
 */

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

// --- Kiểm tra Upstash Redis config ---
function hasRedisConfig(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// --- In-memory implementation ---
async function checkRateLimitMemory(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Math.floor(Date.now() / 1000)
  const windowKey = `${key}:${Math.floor(now / windowSeconds)}`

  let entry = rateLimitStore.get(windowKey)
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: (Math.floor(now / windowSeconds) + 1) * windowSeconds }
  }

  entry.count++
  rateLimitStore.set(windowKey, entry)

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetTime,
  }
}

// --- Upstash Redis implementation ---
async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const { Redis } = await import("@upstash/redis")
  const redis = Redis.fromEnv()

  const now = Math.floor(Date.now() / 1000)
  const windowKey = `${key}:${Math.floor(now / windowSeconds)}`

  const count = await redis.incr(windowKey)
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds)
  }

  const reset = (Math.floor(now / windowSeconds) + 1) * windowSeconds

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset,
  }
}

/**
 * Kiểm tra rate limit. Tự động chọn Redis nếu có config, ngược lại dùng in-memory.
 * @param key - Khóa định danh (vd: "register:192.168.1.1")
 * @param limit - Số request tối đa trong window
 * @param windowSeconds - Khoảng thời gian (giây)
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  if (hasRedisConfig()) {
    try {
      return await checkRateLimitRedis(key, limit, windowSeconds)
    } catch (e) {
      console.warn("Upstash Redis error, falling back to in-memory rate limiter:", e)
    }
  }
  return checkRateLimitMemory(key, limit, windowSeconds)
}

// [SC-12] Removed deprecated checkRateLimitSync and createRateLimiter (MT-03).
// These synchronous wrappers had zero non-test usage. Use the async
// checkRateLimit and the pre-configured rateLimiters object instead.

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

// --- Async rate limiters (Redis-capable, Vercel serverless safe) ---
// Convert checkRateLimit result to RateLimitResult for backward compat
function toRateLimitResult(
  r: Awaited<ReturnType<typeof checkRateLimit>>,
  limit: number
): RateLimitResult {
  return {
    success: r.allowed,
    limit,
    remaining: r.remaining,
    resetTime: r.reset * 1000, // checkRateLimit returns reset in seconds, RateLimitResult uses ms
  }
}

export const rateLimiters = {
  submission: async (userId: string): Promise<RateLimitResult> =>
    toRateLimitResult(await checkRateLimit(`submit:${userId}`, 10, 60), 10),

  examFetch: async (userId: string): Promise<RateLimitResult> =>
    toRateLimitResult(await checkRateLimit(`exam:${userId}`, 30, 60), 30),

  api: async (key: string): Promise<RateLimitResult> =>
    toRateLimitResult(await checkRateLimit(`api:${key}`, 60, 60), 60),

  auth: async (key: string): Promise<RateLimitResult> =>
    toRateLimitResult(await checkRateLimit(`auth:${key}`, 5, 60), 5),

  syncDraft: async (userId: string): Promise<RateLimitResult> =>
    toRateLimitResult(await checkRateLimit(`draft:${userId}`, 20, 60), 20),
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  return 'unknown'
}

export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    }
  )
}
