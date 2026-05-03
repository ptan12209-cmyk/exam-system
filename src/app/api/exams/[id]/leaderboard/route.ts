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
        const rateLimitResult = rateLimiters.api(`leaderboard:${clientIP}`)
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

        // Fetch from database
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select(`
                student_id,
                score,
                time_spent,
                submitted_at,
                profiles!submissions_student_id_fkey (
                    full_name,
                    avatar_url
                )
            `)
            .eq('exam_id', examId)
            .eq('is_ranked', true)
            .order('score', { ascending: false })
            .order('time_spent', { ascending: true })
            .limit(100)

        if (error) {
            console.error('Leaderboard fetch error:', error)
            return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
        }

        // Transform data
        interface ProfileData {
            full_name: string | null
            avatar_url: string | null
        }

        const leaderboard: LeaderboardEntry[] = (submissions || []).map((sub, index) => {
            // Handle both single object and array responses from Supabase
            const profile = Array.isArray(sub.profiles)
                ? sub.profiles[0] as ProfileData | undefined
                : sub.profiles as ProfileData | null

            return {
                rank: index + 1,
                student_id: sub.student_id,
                student_name: profile?.full_name || 'Học sinh',
                avatar_url: profile?.avatar_url || null,
                score: sub.score,
                time_spent: sub.time_spent,
                submitted_at: sub.submitted_at
            }
        })

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
