import { Redis } from '@upstash/redis'

/**
 * Cache Interface
 */
export interface ICache {
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T, ttlMs: number): Promise<void>
    delete(key: string): Promise<void>
    deletePattern(pattern: string): Promise<void>
}

/**
 * Simple In-Memory Cache with TTL
 */
interface CacheEntry<T> {
    value: T
    expiresAt: number
}

class MemoryCache implements ICache {
    private cache = new Map<string, CacheEntry<unknown>>()
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor() {
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined
        if (!entry) return null
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }
        return entry.value
    }

    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        })
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key)
    }

    async deletePattern(pattern: string): Promise<void> {
        const regex = new RegExp(pattern.replace('*', '.*'))
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key)
            }
        }
    }

    private cleanup(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }
}

/**
 * Upstash Redis Cache
 */
class RedisCache implements ICache {
    private redis: Redis

    constructor(url: string, token: string) {
        this.redis = new Redis({ url, token })
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            return await this.redis.get<T>(key)
        } catch (e) {
            console.error('Redis get error:', e)
            return null
        }
    }

    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
        try {
            await this.redis.set(key, value, { px: ttlMs })
        } catch (e) {
            console.error('Redis set error:', e)
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.redis.del(key)
        } catch (e) {
            console.error('Redis del error:', e)
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await this.redis.keys(pattern)
            if (keys.length > 0) {
                await this.redis.del(...keys)
            }
        } catch (e) {
            console.error('Redis deletePattern error:', e)
        }
    }
}

// Initialize cache based on environment
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

export const cache: ICache = (redisUrl && redisToken) 
    ? new RedisCache(redisUrl, redisToken) 
    : new MemoryCache()

if (!(redisUrl && redisToken)) {
    console.warn('⚠️ UPSTASH_REDIS_REST_URL or TOKEN missing. Falling back to MemoryCache (Inconsistent on Vercel).')
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
    EXAM_METADATA: 5 * 60 * 1000,      // 5 minutes
    LEADERBOARD: 30 * 1000,             // 30 seconds
    USER_PROFILE: 2 * 60 * 1000,        // 2 minutes
    EXAM_LIST: 60 * 1000,               // 1 minute
} as const

// Cache key generators
export const cacheKeys = {
    examMetadata: (examId: string) => `exam:${examId}:metadata`,
    leaderboard: (examId: string) => `exam:${examId}:leaderboard`,
    userProfile: (userId: string) => `user:${userId}:profile`,
    examList: (teacherId: string) => `teacher:${teacherId}:exams`,
    studentExams: (studentId: string) => `student:${studentId}:exams`,
}

// Cache invalidation helpers
export const invalidateCache = {
    exam: async (examId: string) => {
        await cache.deletePattern(`exam:${examId}:*`)
    },
    user: async (userId: string) => {
        await cache.deletePattern(`user:${userId}:*`)
        await cache.deletePattern(`student:${userId}:*`)
        await cache.deletePattern(`teacher:${userId}:*`)
    },
    submission: async (examId: string) => {
        await cache.delete(cacheKeys.leaderboard(examId))
    }
}
