import type { SupabaseClient } from "@supabase/supabase-js"
import type { ServiceContext } from "../service-context"
import { resolveContext } from "./resolve-context"

/**
 * Lấy bảng xếp hạng những người dùng có XP cao nhất.
 * Sử dụng tiêm phụ thuộc thông qua ServiceContext hoặc SupabaseClient tùy chọn.
 * Dự phòng sang Supabase client trình duyệt khi không có tham số nào được cung cấp.
 *
 * @param limit - Số lượng mục tối đa trong bảng xếp hạng (mặc định: 10).
 * @param ctx - ServiceContext hoặc SupabaseClient tùy chọn để tiêm phụ thuộc.
 * @returns Promise phân giải thành mảng các mục bảng xếp hạng gồm rank, userId, fullName, xp, level.
 */
export async function getLeaderboard(
    limit: number = 10,
    ctx?: ServiceContext | SupabaseClient
): Promise<{
    rank: number
    userId: string
    fullName: string
    xp: number
    level: number
}[]> {
    const { supabase } = resolveContext(ctx)

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
