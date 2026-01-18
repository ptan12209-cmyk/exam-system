import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/challenges - Get active challenges with user progress
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const today = new Date().toISOString().split("T")[0]

        // Get active challenges
        const { data: challenges, error } = await supabase
            .from("weekly_challenges")
            .select("*")
            .eq("is_active", true)
            .lte("start_date", today)
            .gte("end_date", today)
            .order("xp_reward", { ascending: false })

        if (error) {
            console.error("Error fetching challenges:", error)
            return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 })
        }

        // Get user's progress for each challenge
        const { data: progress } = await supabase
            .from("student_challenges")
            .select("challenge_id, progress, completed, completed_at")
            .eq("user_id", user.id)

        // Merge progress with challenges
        const challengesWithProgress = (challenges || []).map(challenge => {
            const userProgress = progress?.find(p => p.challenge_id === challenge.id)
            return {
                ...challenge,
                userProgress: userProgress?.progress || 0,
                completed: userProgress?.completed || false,
                completedAt: userProgress?.completed_at || null,
                progressPercent: Math.min(
                    ((userProgress?.progress || 0) / challenge.target_value) * 100,
                    100
                )
            }
        })

        // Calculate days remaining in the week
        const endDate = new Date(challenges?.[0]?.end_date || today)
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))

        return NextResponse.json({
            challenges: challengesWithProgress,
            daysRemaining
        })
    } catch (error) {
        console.error("Challenges API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
