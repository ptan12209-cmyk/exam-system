import { Redis } from '@upstash/redis'

/**
 * Hybrid Rate Limiter
 * Uses Redis in production for distributed locking across Vercel serverless functions.
 * Falls back to in-memory Map for local development if Redis is not configured.
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}

// In-memory fallback store
const memoryStore = new Map<string, RateLimitEntry>()

// Clean up memory store periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of memoryStore.entries()) {
            if (entry.resetTime < now) {
                memoryStore.delete(key)
            }
        }
    }, 60000)
}

// Initialize Redis if config is available
let redis: Redis | null = null
try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
    }
} catch (error) {
    console.warn("Failed to initialize Upstash Redis, falling back to memory rate limiting", error)
}

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
export async function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const now = Date.now()
    const key = `ratelimit:${identifier}`

    // 1. Redis Mode (Production)
    if (redis) {
        try {
            // Use Upstash Redis atomic increment and expire
            const multi = redis.multi()
            multi.incr(key)
            // Only set expiry if it's a new key (TTL == -1)
            // Upstash doesn't support complex Lua scripts directly easily, so we use a simpler approach:
            // Always set expiration on every request if we want sliding window, but for fixed window we can just use EXPIRE NX 
            // Workaround: just set it to expire in windowMs / 1000 seconds
            multi.expire(key, Math.ceil(config.windowMs / 1000))
            
            const results = await multi.exec()
            const count = results[0] as number

            const remaining = Math.max(0, config.limit - count)
            const success = count <= config.limit
            const resetTime = now + config.windowMs

            return { success, limit: config.limit, remaining, resetTime }
        } catch (error) {
            console.error("Redis rate limit error, falling back to memory", error)
            // Fall through to memory if Redis fails
        }
    }

    // 2. Memory Mode (Fallback/Local Dev)
    let entry = memoryStore.get(key)

    // If no entry or expired, create new one
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs
        }
    }

    // Increment count
    entry.count++
    memoryStore.set(key, entry)

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

    // Exam auto-save draft (sync-draft): 30 per minute (1 every 2 seconds)
    syncDraft: createRateLimiter({ limit: 30, windowMs: 60 * 1000 }),

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
