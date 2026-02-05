/**
 * Simple In-Memory Cache with TTL
 * For production with multiple instances, use Redis
 */

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

class MemoryCache {
    private cache = new Map<string, CacheEntry<unknown>>()
    private cleanupInterval: NodeJS.Timeout | null = null

    constructor() {
        // Clean up expired entries every minute
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
        }
    }

    /**
     * Get a value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined
        if (!entry) return null

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return null
        }

        return entry.value
    }

    /**
     * Set a value in cache with TTL
     * @param key Cache key
     * @param value Value to cache
     * @param ttlMs Time to live in milliseconds
     */
    set<T>(key: string, value: T, ttlMs: number): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        })
    }

    /**
     * Delete a specific key
     */
    delete(key: string): void {
        this.cache.delete(key)
    }

    /**
     * Delete all keys matching a pattern
     */
    deletePattern(pattern: string): void {
        const regex = new RegExp(pattern.replace('*', '.*'))
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Get or set pattern - fetch from cache or compute and cache
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlMs: number
    ): Promise<T> {
        const cached = this.get<T>(key)
        if (cached !== null) {
            return cached
        }

        const value = await fetcher()
        this.set(key, value, ttlMs)
        return value
    }
}

// Singleton instance
export const cache = new MemoryCache()

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
    exam: (examId: string) => {
        cache.deletePattern(`exam:${examId}:*`)
    },
    user: (userId: string) => {
        cache.deletePattern(`user:${userId}:*`)
        cache.deletePattern(`student:${userId}:*`)
        cache.deletePattern(`teacher:${userId}:*`)
    },
    submission: (examId: string) => {
        // Invalidate leaderboard when new submission
        cache.delete(cacheKeys.leaderboard(examId))
    }
}
