/**
 * In-memory Rate Limiter
 * For production with multiple instances, use Redis-based solution
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key)
        }
    }
}, 60000) // Clean every minute

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    limit: number
    /** Time window in milliseconds */
    windowMs: number
}

export interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    resetTime: number
}

/**
 * Check rate limit for a given identifier
 * @param identifier Unique identifier (e.g., user ID, IP address)
 * @param config Rate limit configuration
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now()
    const key = identifier

    let entry = rateLimitStore.get(key)

    // If no entry or expired, create new one
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs
        }
    }

    // Increment count
    entry.count++
    rateLimitStore.set(key, entry)

    const remaining = Math.max(0, config.limit - entry.count)
    const success = entry.count <= config.limit

    return {
        success,
        limit: config.limit,
        remaining,
        resetTime: entry.resetTime
    }
}

/**
 * Create a rate limiter with preset configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
    return (identifier: string) => checkRateLimit(identifier, config)
}

// Preset rate limiters
export const rateLimiters = {
    // Exam submission: 10 per minute per user
    submission: createRateLimiter({ limit: 10, windowMs: 60 * 1000 }),

    // API requests: 100 per minute per IP
    api: createRateLimiter({ limit: 100, windowMs: 60 * 1000 }),

    // Auth attempts: 5 per minute per IP
    auth: createRateLimiter({ limit: 5, windowMs: 60 * 1000 }),

    // Exam questions fetch: 30 per minute per user
    examFetch: createRateLimiter({ limit: 30, windowMs: 60 * 1000 })
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    // Check various headers for real IP (when behind proxy/CDN)
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    if (cfConnectingIP) {
        return cfConnectingIP
    }

    return 'unknown'
}

/**
 * Rate limit response helper
 */
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
