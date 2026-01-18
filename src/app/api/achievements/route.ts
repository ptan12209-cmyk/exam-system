import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/achievements - Get all achievements and user progress
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all achievements
        const { data: achievements, error: achievementsError } = await supabase
            .from("achievements")
            .select("*")
            .order("sort_order")

        if (achievementsError) {
            console.error("Get achievements error:", achievementsError)
            return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
        }

        // Get user's unlocked achievements
        const { data: userAchievements } = await supabase
            .from("user_achievements")
            .select("achievement_id, unlocked_at, is_featured")
            .eq("user_id", user.id)

        const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
        const featuredIds = new Set(
            userAchievements?.filter(ua => ua.is_featured).map(ua => ua.achievement_id) || []
        )

        // Get user stats for progress calculation
        const { data: stats } = await supabase
            .from("student_stats")
            .select("*")
            .eq("user_id", user.id)
            .single()

        // Merge achievements with user progress
        const mergedAchievements = achievements?.map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id)
            const isFeatured = featuredIds.has(achievement.id)

            // Calculate progress
            let currentValue = 0
            if (stats) {
                switch (achievement.condition_type) {
                    case "exams_completed":
                        currentValue = stats.exams_completed || 0
                        break
                    case "streak_days":
                        currentValue = stats.streak_days || 0
                        break
                    case "perfect_scores":
                        currentValue = stats.perfect_scores || 0
                        break
                    case "total_xp":
                        currentValue = stats.xp || 0
                        break
                    case "level":
                        currentValue = stats.level || 1
                        break
                }
            }

            return {
                ...achievement,
                isUnlocked,
                isFeatured,
                currentValue,
                progress: Math.min((currentValue / achievement.condition_value) * 100, 100)
            }
        }) || []

        // Group by category
        const categories = ["study", "streak", "score", "xp", "level"]
        const grouped = categories.reduce((acc, category) => {
            acc[category] = mergedAchievements.filter(a => a.category === category)
            return acc
        }, {} as Record<string, typeof mergedAchievements>)

        // Stats summary
        const totalAchievements = achievements?.length || 0
        const unlockedCount = unlockedIds.size

        return NextResponse.json({
            achievements: mergedAchievements,
            grouped,
            stats: {
                total: totalAchievements,
                unlocked: unlockedCount,
                percentage: totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0
            }
        })

    } catch (error) {
        console.error("Achievements API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/achievements/feature - Toggle featured achievement
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { achievementId, featured } = await request.json()

        if (!achievementId) {
            return NextResponse.json({ error: "Achievement ID required" }, { status: 400 })
        }

        // Update featured status
        const { error } = await supabase
            .from("user_achievements")
            .update({ is_featured: featured })
            .eq("user_id", user.id)
            .eq("achievement_id", achievementId)

        if (error) {
            return NextResponse.json({ error: "Failed to update" }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Feature achievement error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
