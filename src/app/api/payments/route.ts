import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createPaymentUrl, generateOrderId } from "@/lib/vnpay"

// POST /api/payments/create - Create a new payment
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { type, planId, packageId, billingCycle } = body

        // Validate request
        if (!type || !["subscription", "package"].includes(type)) {
            return NextResponse.json({ error: "Invalid payment type" }, { status: 400 })
        }

        let amount = 0
        let orderInfo = ""
        let subscriptionId: string | null = null
        let purchasePackageId: string | null = null

        if (type === "subscription") {
            if (!planId) {
                return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
            }

            // Get plan details
            const { data: plan, error: planError } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("id", planId)
                .single()

            if (planError || !plan) {
                return NextResponse.json({ error: "Plan not found" }, { status: 404 })
            }

            // Calculate amount based on billing cycle
            amount = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly
            orderInfo = `Đăng ký gói ${plan.name} - ${billingCycle === "yearly" ? "Năm" : "Tháng"}`

            // Create pending subscription
            const expiresAt = new Date()
            if (billingCycle === "yearly") {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1)
            } else {
                expiresAt.setMonth(expiresAt.getMonth() + 1)
            }

            const { data: subscription, error: subError } = await supabase
                .from("user_subscriptions")
                .insert({
                    user_id: user.id,
                    plan_id: planId,
                    status: "pending",
                    billing_cycle: billingCycle || "monthly",
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single()

            if (subError || !subscription) {
                console.error("Create subscription error:", subError)
                return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
            }

            subscriptionId = subscription.id

        } else if (type === "package") {
            if (!packageId) {
                return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
            }

            // Get package details
            const { data: pkg, error: pkgError } = await supabase
                .from("exam_packages")
                .select("*")
                .eq("id", packageId)
                .eq("is_published", true)
                .single()

            if (pkgError || !pkg) {
                return NextResponse.json({ error: "Package not found" }, { status: 404 })
            }

            // Check if already purchased
            const { data: existingPurchase } = await supabase
                .from("purchases")
                .select("id")
                .eq("buyer_id", user.id)
                .eq("package_id", packageId)
                .eq("payment_status", "completed")
                .single()

            if (existingPurchase) {
                return NextResponse.json({ error: "Already purchased" }, { status: 400 })
            }

            amount = pkg.price
            orderInfo = `Mua gói đề: ${pkg.title}`
            purchasePackageId = packageId
        }

        // Free items
        if (amount === 0) {
            // Handle free subscription or package
            if (subscriptionId) {
                await supabase
                    .from("user_subscriptions")
                    .update({ status: "active" })
                    .eq("id", subscriptionId)
            }

            if (purchasePackageId) {
                await supabase
                    .from("purchases")
                    .insert({
                        buyer_id: user.id,
                        package_id: purchasePackageId,
                        amount: 0,
                        payment_status: "completed",
                        completed_at: new Date().toISOString(),
                    })
            }

            return NextResponse.json({
                success: true,
                free: true,
                message: "Đăng ký thành công (miễn phí)",
            })
        }

        // Generate order ID
        const orderId = generateOrderId()

        // Get client IP
        const forwarded = request.headers.get("x-forwarded-for")
        const ipAddress = forwarded ? forwarded.split(",")[0] : "127.0.0.1"

        // Create payment record
        const { data: purchase, error: purchaseError } = await supabase
            .from("purchases")
            .insert({
                buyer_id: user.id,
                package_id: purchasePackageId,
                subscription_id: subscriptionId,
                amount,
                payment_provider: "vnpay",
                payment_id: orderId,
                payment_status: "pending",
            })
            .select()
            .single()

        if (purchaseError || !purchase) {
            console.error("Create purchase error:", purchaseError)
            return NextResponse.json({ error: "Failed to create payment record" }, { status: 500 })
        }

        // Get base URL for return
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
        const returnUrl = `${baseUrl}/api/payments/callback`

        // Create VNPay payment URL
        const paymentResult = await createPaymentUrl({
            orderId,
            amount,
            orderInfo,
            returnUrl,
            ipAddress,
        })

        if (!paymentResult.success || !paymentResult.paymentUrl) {
            return NextResponse.json({
                error: paymentResult.error || "Failed to create payment URL"
            }, { status: 500 })
        }

        // Update purchase with payment URL
        await supabase
            .from("purchases")
            .update({ payment_url: paymentResult.paymentUrl })
            .eq("id", purchase.id)

        return NextResponse.json({
            success: true,
            paymentUrl: paymentResult.paymentUrl,
            orderId,
        })

    } catch (error) {
        console.error("Payment create error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// GET /api/payments - Get user's payment history
export async function GET() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: purchases, error } = await supabase
            .from("purchases")
            .select(`
                *,
                package:exam_packages(id, title),
                subscription:user_subscriptions(id, plan:subscription_plans(name))
            `)
            .eq("buyer_id", user.id)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Get payments error:", error)
            return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
        }

        return NextResponse.json({ purchases })

    } catch (error) {
        console.error("Payments API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
