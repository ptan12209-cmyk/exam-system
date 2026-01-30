import { createClient } from "@/lib/supabase/client"

// XP rewards
export const XP_REWARDS = {
    EXAM_COMPLETED: 50,
    HIGH_SCORE: 20,      // Score >= 8
    PERFECT_SCORE: 100,  // Score = 10
    STREAK_BONUS: 10,    // Per day of streak
    BADGE_EARNED: 0      // Badge has its own XP reward
}

interface Badge {
    id: string
    name: string
    condition_type: string
    condition_value: number
    xp_reward: number
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1
}

// Calculate XP needed for next level
export function xpForNextLevel(currentLevel: number): number {
    return Math.pow(currentLevel, 2) * 100
}

// Calculate progress to next level (0-100%)
export function levelProgress(xp: number): number {
    const currentLevel = calculateLevel(xp)
    const xpForCurrent = Math.pow(currentLevel - 1, 2) * 100
    const xpForNext = xpForNextLevel(currentLevel)
    const progress = ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100
    return Math.min(Math.max(progress, 0), 100)
}

// Calculate XP earned from an exam
export function calculateExamXP(score: number): number {
    let xp = XP_REWARDS.EXAM_COMPLETED

    if (score >= 10) {
        xp += XP_REWARDS.PERFECT_SCORE
    } else if (score >= 8) {
        xp += XP_REWARDS.HIGH_SCORE
    }

    return xp
}

// Helper to calculate new badges
function calculateNewBadges(
    badges: Badge[],
    earnedIds: Set<string>,
    stats: {
        examsCompleted: number
        streak: number
        perfectScores: number
    }
): { newBadges: Badge[], totalBadgeXP: number } {
    const newBadges: Badge[] = []
    let totalBadgeXP = 0

    for (const badge of badges) {
        if (earnedIds.has(badge.id)) continue

        let earned = false

        switch (badge.condition_type) {
            case "first_exam":
                earned = stats.examsCompleted >= 1
                break
            case "exams_completed":
                earned = stats.examsCompleted >= badge.condition_value
                break
            case "streak":
                earned = stats.streak >= badge.condition_value
                break
            case "perfect_score":
                earned = stats.perfectScores >= badge.condition_value
                break
        }

        if (earned) {
            newBadges.push(badge)
            totalBadgeXP += badge.xp_reward || 0
        }
    }

    return { newBadges, totalBadgeXP }
}

// Update student stats after exam completion
export async function updateStudentStats(
    userId: string,
    score: number
): Promise<{
    xpGained: number
    newLevel: number
    leveledUp: boolean
    newBadges: string[]
}> {
    const supabase = createClient()

    // Get or create student stats
    // We need to query this first because we need the current stats to calculate new stats
    let { data: stats } = await supabase
        .from("student_stats")
        .select("*")
        .eq("user_id", userId)
        .single()

    if (!stats) {
        // Create new stats record
        const { data: newStats } = await supabase
            .from("student_stats")
            .insert({ user_id: userId })
            .select()
            .single()
        stats = newStats
    }

    if (!stats) {
        return { xpGained: 0, newLevel: 1, leveledUp: false, newBadges: [] }
    }

    // Parallel fetch for badges and earned badges
    const [badgesResult, earnedBadgesResult] = await Promise.all([
        supabase.from("badges").select("*"),
        supabase.from("student_badges").select("badge_id").eq("user_id", userId)
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badges: Badge[] = (badgesResult.data || []) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earnedIds = new Set(earnedBadgesResult.data?.map((b: any) => b.badge_id) || [])

    const oldLevel = calculateLevel(stats.xp)

    // Calculate Exam XP
    let xpGained = calculateExamXP(score)

    // Check streak
    const today = new Date().toISOString().split("T")[0]
    const lastExamDate = stats.last_exam_date
    let newStreak = 1

    if (lastExamDate) {
        const lastDate = new Date(lastExamDate)
        const todayDate = new Date(today)
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
            newStreak = stats.streak_days + 1
            xpGained += XP_REWARDS.STREAK_BONUS * newStreak
        } else if (diffDays === 0) {
            newStreak = stats.streak_days // Same day, keep streak
        }
    }

    // Calculate potential new stats
    const newExamsCompleted = stats.exams_completed + 1
    const newPerfectScores = score >= 10 ? stats.perfect_scores + 1 : stats.perfect_scores

    // Calculate new badges with new stats
    const { newBadges, totalBadgeXP } = calculateNewBadges(badges, earnedIds, {
        examsCompleted: newExamsCompleted,
        streak: newStreak,
        perfectScores: newPerfectScores
    })

    // Calculate final XP and Level
    const finalXP = stats.xp + xpGained + totalBadgeXP
    const newLevel = calculateLevel(finalXP)

    // Single Update
    await supabase
        .from("student_stats")
        .update({
            xp: finalXP,
            level: newLevel,
            streak_days: newStreak,
            last_exam_date: today,
            exams_completed: newExamsCompleted,
            perfect_scores: newPerfectScores
        })
        .eq("user_id", userId)

    // Single Bulk Insert
    if (newBadges.length > 0) {
        await supabase
            .from("student_badges")
            .insert(newBadges.map(b => ({ user_id: userId, badge_id: b.id })))
    }

    return {
        xpGained,
        newLevel,
        leveledUp: newLevel > oldLevel,
        newBadges: newBadges.map(b => b.name)
    }
}

// Get leaderboard
export async function getLeaderboard(limit: number = 10): Promise<{
    rank: number
    userId: string
    fullName: string
    xp: number
    level: number
}[]> {
    const supabase = createClient()

    const { data } = await supabase
        .from("student_stats")
        .select(`
            user_id,
            xp,
            level,
            profile:profiles(full_name)
        `)
        .order("xp", { ascending: false })
        .limit(limit)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((item: any, index: number) => ({
        rank: index + 1,
        userId: item.user_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fullName: (item.profile as any)?.full_name || "Học sinh",
        xp: item.xp,
        level: item.level
    }))
}

// Get user stats
export async function getUserStats(userId: string) {
    const supabase = createClient()

    const { data: stats } = await supabase
        .from("student_stats")
        .select("*")
        .eq("user_id", userId)
        .single()

    const { data: badges } = await supabase
        .from("student_badges")
        .select(`
            earned_at,
            badge:badges(*)
        `)
        .eq("user_id", userId)

    return {
        stats: stats || { xp: 0, level: 1, streak_days: 0, exams_completed: 0, perfect_scores: 0 },
        badges: badges || []
    }
}
