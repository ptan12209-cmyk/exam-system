import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/daily-checkin - Perform daily check-in
export async function POST() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Call the daily_checkin function
        const { data, error } = await supabase.rpc("daily_checkin", {
            p_user_id: user.id
        })

        if (error) {
            console.error("Daily checkin error:", error)
            return NextResponse.json({ error: "Failed to check in" }, { status: 500 })
        }

        // Check for new achievements
        const { data: achievementData } = await supabase.rpc("check_and_unlock_achievements", {
            p_user_id: user.id
        })

        return NextResponse.json({
            ...data,
            newAchievements: achievementData?.unlocked || [],
            achievementXp: achievementData?.xp_earned || 0
        })

    } catch (error) {
        console.error("Daily checkin API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// GET /api/daily-checkin - Get current streak status
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const today = new Date().toISOString().split("T")[0]

        // Get today's login
        const { data: todayLogin } = await supabase
            .from("daily_logins")
            .select("*")
            .eq("user_id", user.id)
            .eq("login_date", today)
            .single()

        // Get user stats for streak
        const { data: stats } = await supabase
            .from("student_stats")
            .select("streak_days, xp, level")
            .eq("user_id", user.id)
            .single()

        // Get last 7 days of logins for calendar
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: recentLogins } = await supabase
            .from("daily_logins")
            .select("login_date, xp_earned")
            .eq("user_id", user.id)
            .gte("login_date", sevenDaysAgo.toISOString().split("T")[0])
            .order("login_date", { ascending: false })

        return NextResponse.json({
            checkedInToday: !!todayLogin,
            currentStreak: stats?.streak_days || 0,
            xp: stats?.xp || 0,
            level: stats?.level || 1,
            recentLogins: recentLogins || [],
            todayXp: todayLogin?.xp_earned || 0
        })

    } catch (error) {
        console.error("Streak status API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
