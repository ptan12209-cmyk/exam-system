import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/titles - Get all titles and user's equipped title
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all titles
        const { data: titles, error: titlesError } = await supabase
            .from("titles")
            .select("*")
            .order("sort_order")

        if (titlesError) {
            console.error("Get titles error:", titlesError)
            return NextResponse.json({ error: "Failed to fetch titles" }, { status: 500 })
        }

        // Get user's XP and equipped title
        const { data: stats } = await supabase
            .from("student_stats")
            .select("xp")
            .eq("user_id", user.id)
            .single()

        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_title_id")
            .eq("id", user.id)
            .single()

        // Get user's unlocked achievements for achievement-locked titles
        const { data: userAchievements } = await supabase
            .from("user_achievements")
            .select("achievement_id")
            .eq("user_id", user.id)

        const unlockedAchievementIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
        const userXp = stats?.xp || 0

        // Mark which titles are unlocked
        const titlesWithUnlock = titles?.map(title => {
            let isUnlocked = false

            if (title.unlock_xp !== null) {
                isUnlocked = userXp >= title.unlock_xp
            } else if (title.unlock_achievement_id) {
                isUnlocked = unlockedAchievementIds.has(title.unlock_achievement_id)
            } else {
                isUnlocked = true // No unlock requirement
            }

            return {
                ...title,
                isUnlocked,
                isEquipped: profile?.equipped_title_id === title.id
            }
        }) || []

        return NextResponse.json({
            titles: titlesWithUnlock,
            equippedTitleId: profile?.equipped_title_id,
            userXp
        })

    } catch (error) {
        console.error("Titles API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/titles - Equip a title
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { titleId } = await request.json()

        // Verify user can equip this title
        if (titleId) {
            const { data: title } = await supabase
                .from("titles")
                .select("*")
                .eq("id", titleId)
                .single()

            if (!title) {
                return NextResponse.json({ error: "Title not found" }, { status: 404 })
            }

            // Check XP requirement
            if (title.unlock_xp !== null) {
                const { data: stats } = await supabase
                    .from("student_stats")
                    .select("xp")
                    .eq("user_id", user.id)
                    .single()

                if ((stats?.xp || 0) < title.unlock_xp) {
                    return NextResponse.json({ error: "Not enough XP" }, { status: 403 })
                }
            }

            // Check achievement requirement
            if (title.unlock_achievement_id) {
                const { data: userAchievement } = await supabase
                    .from("user_achievements")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("achievement_id", title.unlock_achievement_id)
                    .single()

                if (!userAchievement) {
                    return NextResponse.json({ error: "Achievement not unlocked" }, { status: 403 })
                }
            }
        }

        // Update profile
        const { error } = await supabase
            .from("profiles")
            .update({ equipped_title_id: titleId })
            .eq("id", user.id)

        if (error) {
            console.error("Equip title error:", error)
            return NextResponse.json({ error: "Failed to equip title" }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Equip title error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
