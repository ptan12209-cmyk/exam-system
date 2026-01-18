import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/subscriptions - Get user's subscription status and available plans
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all active plans
        const { data: plans, error: plansError } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order")

        if (plansError) {
            console.error("Get plans error:", plansError)
            return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 })
        }

        // Get user's current subscription
        const { data: subscription, error: subError } = await supabase
            .from("user_subscriptions")
            .select(`
                *,
                plan:subscription_plans(*)
            `)
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

        // Not an error if no subscription found
        const currentSubscription = subError ? null : subscription

        return NextResponse.json({
            plans,
            currentSubscription,
            hasActiveSubscription: !!currentSubscription,
        })

    } catch (error) {
        console.error("Subscriptions API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// DELETE /api/subscriptions - Cancel subscription
export async function DELETE() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Find active subscription
        const { data: subscription, error: findError } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .single()

        if (findError || !subscription) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
        }

        // Cancel the subscription
        const { error: updateError } = await supabase
            .from("user_subscriptions")
            .update({
                status: "cancelled",
                cancelled_at: new Date().toISOString(),
            })
            .eq("id", subscription.id)

        if (updateError) {
            console.error("Cancel subscription error:", updateError)
            return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: "Đã hủy đăng ký. Bạn vẫn có thể sử dụng đến hết thời hạn.",
        })

    } catch (error) {
        console.error("Cancel subscription error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
