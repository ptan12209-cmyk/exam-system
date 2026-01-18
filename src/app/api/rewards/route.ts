import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/rewards - Get all active rewards
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all active rewards
        const { data: rewards, error } = await supabase
            .from("rewards")
            .select("*")
            .eq("is_active", true)
            .order("xp_cost", { ascending: true })

        if (error) {
            console.error("Error fetching rewards:", error)
            return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 })
        }

        // Get user's current XP
        const { data: stats } = await supabase
            .from("student_stats")
            .select("xp")
            .eq("user_id", user.id)
            .single()

        // Get user's redeemed rewards
        const { data: redeemed } = await supabase
            .from("student_rewards")
            .select("reward_id, redeemed_at")
            .eq("user_id", user.id)

        return NextResponse.json({
            rewards,
            userXp: stats?.xp || 0,
            redeemedRewards: redeemed || []
        })
    } catch (error) {
        console.error("Rewards API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// POST /api/rewards - Redeem a reward
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { rewardId } = body

        if (!rewardId) {
            return NextResponse.json({ error: "Reward ID is required" }, { status: 400 })
        }

        // Call the redeem_reward function
        const { data, error } = await supabase
            .rpc("redeem_reward", {
                p_user_id: user.id,
                p_reward_id: rewardId
            })

        if (error) {
            console.error("Error redeeming reward:", error)
            return NextResponse.json({ error: "Failed to redeem reward" }, { status: 500 })
        }

        if (!data.success) {
            return NextResponse.json({
                error: data.error,
                required: data.required,
                current: data.current
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            rewardName: data.reward_name,
            xpSpent: data.xp_spent,
            remainingXp: data.remaining_xp
        })
    } catch (error) {
        console.error("Redeem API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
