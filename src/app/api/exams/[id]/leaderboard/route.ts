import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cache, CACHE_TTL, cacheKeys } from '@/lib/cache'
import { rateLimiters, rateLimitResponse, getClientIP } from '@/lib/rate-limit'

interface RouteParams {
    params: Promise<{ id: string }>
}

interface LeaderboardEntry {
    rank: number
    student_id: string
    student_name: string
    avatar_url: string | null
    score: number
    time_spent: number
    submitted_at: string
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const examId = resolvedParams.id
        const supabase = await createClient()
        const clientIP = getClientIP(request)

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = await rateLimiters.api(`leaderboard:${clientIP}`)
        if (!rateLimitResult.success) {
            return rateLimitResponse(rateLimitResult)
        }

        // Try cache first
        const cacheKey = cacheKeys.leaderboard(examId)
        const cached = cache.get<LeaderboardEntry[]>(cacheKey)

        if (cached) {
            return NextResponse.json({
                leaderboard: cached,
                cached: true,
                cache_ttl: CACHE_TTL.LEADERBOARD / 1000
            })
        }

        // Fetch via the security-definer RPC: aggregate ranking only, no
        // access to other students' answers.
        const { data: rpcRows, error } = await supabase
            .rpc('get_exam_leaderboard', { exam_uuid: examId })

        if (error) {
            console.error('Leaderboard fetch error:', error)
            return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
        }

        const leaderboard: LeaderboardEntry[] = (rpcRows || []).map((row: {
            rank: number
            student_id: string
            student_name: string | null
            score: number
            time_spent: number
            submitted_at: string
        }) => ({
            rank: Number(row.rank),
            student_id: row.student_id,
            student_name: row.student_name || 'Học sinh',
            avatar_url: null,
            score: row.score,
            time_spent: row.time_spent,
            submitted_at: row.submitted_at
        }))

        // Cache the result
        cache.set(cacheKey, leaderboard, CACHE_TTL.LEADERBOARD)

        return NextResponse.json({
            leaderboard,
            cached: false,
            cache_ttl: CACHE_TTL.LEADERBOARD / 1000
        })

    } catch (error) {
        console.error('Leaderboard API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
