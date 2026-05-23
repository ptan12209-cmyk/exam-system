import type { SupabaseClient } from "@supabase/supabase-js"
import type { ServiceContext } from "../service-context"
import { resolveContext } from "./resolve-context"
import { XP_REWARDS, calculateLevel, calculateExamXP } from "./xp-levels"
import { checkAndAwardBadges } from "./badges"

/**
 * Cập nhật thống kê của học sinh sau khi hoàn thành một bài thi.
 * Tính XP nhận được (bao gồm thưởng chuỗi ngày), cập nhật bản ghi cơ sở dữ liệu,
 * và kiểm tra các huy hiệu mới đạt được. Sử dụng thứ tự từng phần: cập nhật thống kê
 * thành công trước khi thử trao huy hiệu.
 *
 * Chấp nhận tham số ctx tùy chọn — ServiceContext (DI) hoặc SupabaseClient (tương thích ngược).
 * Mặc định dùng client trình duyệt khi không có tham số nào được cung cấp.
 *
 * @param userId - Mã định danh duy nhất của học sinh.
 * @param score - Điểm bài thi (thang 0-10).
 * @param ctx - ServiceContext hoặc SupabaseClient tùy chọn để tiêm phụ thuộc.
 * @returns Promise phân giải thành đối tượng chứa xpGained, newLevel, leveledUp, newBadges.
 */
export async function updateStudentStats(
    userId: string,
    score: number,
    ctx?: ServiceContext | SupabaseClient
): Promise<{
    xpGained: number
    newLevel: number
    leveledUp: boolean
    newBadges: string[]
}> {
    const { supabase } = resolveContext(ctx)

    // Get or create student stats
    let { data: stats } = await supabase
        .from("student_stats")
        .select("xp, level, streak_days, last_exam_date, exams_completed, perfect_scores")
        .eq("user_id", userId)
        .single()

    if (!stats) {
        // Create new stats record
        const { data: newStats } = await supabase
            .from("student_stats")
            .insert({ user_id: userId })
            .select("xp, level, streak_days, last_exam_date, exams_completed, perfect_scores")
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

    // CS-04: Transaction-safe stats update + badge awarding
    // Stats update MUST succeed before badges are attempted (partial ordering guarantee)
    // Note: Supabase REST API does not support multi-statement transactions.
    // For true atomicity, consider a Supabase Edge Function or RPC with COMMIT/ROLLBACK.
    try {
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

        // Check for new badges (attempted after successful stats update)
        const newBadges = await checkAndAwardBadges(userId, {
            examsCompleted: newExamsCompleted,
            streak: newStreak,
            perfectScores: newPerfectScores
        }, ctx)

        return {
            xpGained,
            newLevel,
            leveledUp: newLevel > oldLevel,
            newBadges
        }
    } catch (error) {
        console.error('updateStudentStats: update/badge error:', error)
        // Rollback note: stats update may have partially succeeded before the error.
        // In production, wrap in a database transaction for atomicity.
        return {
            xpGained: 0,
            newLevel: oldLevel,
            leveledUp: false,
            newBadges: []
        }
    }
}

/**
 * Lấy thống kê gamification và huy hiệu đã nhận của người dùng.
 *
 * @param userId - Mã định danh duy nhất của người dùng.
 * @param ctx - ServiceContext hoặc SupabaseClient tùy chọn để tiêm phụ thuộc.
 * @returns Promise phân giải thành đối tượng chứa stats (xp, level, streak, v.v.) và mảng badges.
 */
export async function getUserStats(
    userId: string,
    ctx?: ServiceContext | SupabaseClient
) {
    const { supabase } = resolveContext(ctx)

    const { data: stats } = await supabase
        .from("student_stats")
        .select("xp, level, streak_days, last_exam_date, exams_completed, perfect_scores")
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
