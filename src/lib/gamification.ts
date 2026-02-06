import { createClient } from "@/lib/supabase/client"

// XP rewards
export const XP_REWARDS = {
    EXAM_COMPLETED: 50,
    HIGH_SCORE: 20,      // Score >= 8
    PERFECT_SCORE: 100,  // Score = 10
    STREAK_BONUS: 10,    // Per day of streak
    BADGE_EARNED: 0      // Badge has its own XP reward
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

    const oldLevel = calculateLevel(stats.xp)

    // Calculate XP
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

    // Update stats
    const newXP = stats.xp + xpGained
    const newExamsCompleted = stats.exams_completed + 1
    const newPerfectScores = score >= 10 ? stats.perfect_scores + 1 : stats.perfect_scores
    const newLevel = calculateLevel(newXP)

    await supabase
        .from("student_stats")
        .update({
            xp: newXP,
            level: newLevel,
            streak_days: newStreak,
            last_exam_date: today,
            exams_completed: newExamsCompleted,
            perfect_scores: newPerfectScores
        })
        .eq("user_id", userId)

    // Check for new badges
    const newBadges = await checkAndAwardBadges(userId, {
        examsCompleted: newExamsCompleted,
        streak: newStreak,
        perfectScores: newPerfectScores
    })

    return {
        xpGained,
        newLevel,
        leveledUp: newLevel > oldLevel,
        newBadges
    }
}

// Check and award badges
async function checkAndAwardBadges(
    userId: string,
    stats: {
        examsCompleted: number
        streak: number
        perfectScores: number
    }
): Promise<string[]> {
    const supabase = createClient()

    // Get all badges
    const { data: badges } = await supabase
        .from("badges")
        .select("*")

    // Get user's existing badges
    const { data: earnedBadges } = await supabase
        .from("student_badges")
        .select("badge_id")
        .eq("user_id", userId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earnedIds = new Set(earnedBadges?.map((b: any) => b.badge_id) || [])
    const newBadgeNames: string[] = []

    for (const badge of badges || []) {
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
            // Award badge
            await supabase
                .from("student_badges")
                .insert({ user_id: userId, badge_id: badge.id })

            // Add XP reward
            if (badge.xp_reward > 0) {
                await supabase
                    .from("student_stats")
                    .update({ xp: supabase.rpc("increment_xp", { user_id: userId, amount: badge.xp_reward }) })
                    .eq("user_id", userId)
            }

            newBadgeNames.push(badge.name)
        }
    }

    return newBadgeNames
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

    // 🐛 FIX BUG-003: Proper type definition instead of `as any`
    interface LeaderboardItem {
        user_id: string
        xp: number
        level: number
        profile: { full_name: string | null } | { full_name: string | null }[] | null
    }

    return (data || []).map((item: LeaderboardItem, index: number) => {
        // Handle both single object and array responses from Supabase
        const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile
        return {
            rank: index + 1,
            userId: item.user_id,
            fullName: profile?.full_name || "Học sinh",
            xp: item.xp,
            level: item.level
        }
    })
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
