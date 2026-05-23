import type { SupabaseClient } from "@supabase/supabase-js"
import type { ServiceContext } from "../service-context"
import type { ICache } from "../cache"
import { resolveContext } from "./resolve-context"

/**
 * Đại diện cho một định nghĩa huy hiệu từ cơ sở dữ liệu.
 * Huy hiệu được trao khi đáp ứng các điều kiện cụ thể như hoàn thành
 * một số lượng bài thi nhất định hoặc duy trì chuỗi ngày liên tục.
 */
export interface Badge {
    /** Mã định danh duy nhất của huy hiệu. */
    id: string
    /** Tên hiển thị của huy hiệu. */
    name: string
    /** Loại điều kiện (ví dụ: "first_exam", "exams_completed", "streak", "perfect_score"). */
    condition_type: string
    /** Ngưỡng số cần đạt để nhận huy hiệu. */
    condition_value: number
    /** XP thưởng khi nhận được huy hiệu. */
    xp_reward: number
}

// PF-04: Module-level badges cache as fallback (when no ServiceContext cache is provided)
let badgesCache: Badge[] | null = null
let badgesCacheTime = 0
const BADGES_CACHE_TTL = 3600_000 // 1 hour

/** Đặt lại bộ nhớ đệm huy hiệu (dành cho kiểm thử — tránh ô nhiễm bộ nhớ đệm giữa các bài kiểm thử). */
export function resetBadgesCache() {
  badgesCache = null
  badgesCacheTime = 0
}

/**
 * Lấy tất cả định nghĩa huy hiệu từ cơ sở dữ liệu.
 * Sử dụng bộ nhớ đệm từ ServiceContext khi có sẵn (mẫu DI),
 * dự phòng sang bộ nhớ đệm cấp mô-đun để tương thích ngược.
 * Thời gian sống của bộ nhớ đệm: 1 giờ.
 *
 * @param supabase - Phiên bản Supabase client để truy vấn cơ sở dữ liệu.
 * @param cache - Phiên bản bộ nhớ đệm tùy chọn từ ServiceContext; dùng bộ nhớ đệm cấp mô-đun khi null.
 * @returns Promise phân giải thành mảng các đối tượng Badge.
 */
export async function getBadges(
    supabase: SupabaseClient,
    cache: ICache | null
): Promise<Badge[]> {
    // Use ServiceContext cache if available
    if (cache) {
        const cached = await cache.get<Badge[]>("gamification:badges")
        if (cached) return cached

        const { data } = await supabase.from("badges").select("id, name, condition_type, condition_value, xp_reward")
        const badges = (data as Badge[]) || []
        await cache.set("gamification:badges", badges, BADGES_CACHE_TTL)
        return badges
    }

    // Fallback to module-level cache (backward compat)
    const now = Date.now()
    if (badgesCache && (now - badgesCacheTime) < BADGES_CACHE_TTL) {
        return badgesCache
    }
    const { data } = await supabase.from("badges").select("*")
    badgesCache = (data as Badge[]) || []
    badgesCacheTime = now
    return badgesCache
}

/**
 * Kiểm tra tất cả điều kiện huy hiệu cho người dùng và trao các huy hiệu mới đạt được.
 * Xác thực từng điều kiện của huy hiệu dựa trên thống kê hiện tại của người dùng,
 * chèn bản ghi huy hiệu nếu đủ điều kiện, và cấp XP thưởng tương ứng.
 * Cách ly lỗi theo từng huy hiệu: lỗi của một huy hiệu không ngăn cản việc trao các huy hiệu khác.
 *
 * @param userId - Mã định danh duy nhất của người dùng.
 * @param stats - Thống kê hiện tại của người dùng (examsCompleted, streak, perfectScores).
 * @param ctx - ServiceContext hoặc SupabaseClient tùy chọn để tiêm phụ thuộc.
 * @returns Promise phân giải thành mảng tên các huy hiệu vừa được trao.
 */
export async function checkAndAwardBadges(
    userId: string,
    stats: {
        examsCompleted: number
        streak: number
        perfectScores: number
    },
    ctx?: ServiceContext | SupabaseClient
): Promise<string[]> {
    const { supabase, cache } = resolveContext(ctx)

    // Get all badges (with DI cache or PF-04 fallback)
    const badges = await getBadges(supabase, cache)

    // Get user's existing badges
    const { data: earnedBadges } = await supabase
        .from("student_badges")
        .select("badge_id")
        .eq("user_id", userId)

    const earnedIds = new Set(earnedBadges?.map((b: { badge_id: string }) => b.badge_id) || [])
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
            // CS-04: Per-badge error isolation — one badge failure should not block others
            try {
                // Award badge
                await supabase
                    .from("student_badges")
                    .insert({ user_id: userId, badge_id: badge.id })

                // Add XP reward
                if (badge.xp_reward > 0) {
                    const { data: currentStats } = await supabase
                        .from("student_stats")
                        .select("xp, level, streak_days, exams_completed, perfect_scores")
                        .eq("user_id", userId)
                        .single()

                    const updatedXp = (currentStats?.xp || 0) + badge.xp_reward
                    await supabase
                        .from("student_stats")
                        .update({ xp: updatedXp })
                        .eq("user_id", userId)
                }

                newBadgeNames.push(badge.name)
            } catch (badgeError) {
                console.error(`Failed to award badge "${badge.name}":`, badgeError)
                // Continue to next badge — partial failure is acceptable for gamification
            }
        }
    }

    return newBadgeNames
}
