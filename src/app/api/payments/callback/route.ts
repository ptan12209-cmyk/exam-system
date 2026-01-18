import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { verifyReturnUrl, VerifyReturnParams } from "@/lib/vnpay"

// GET /api/payments/callback - VNPay return URL handler
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams

        // Extract VNPay parameters
        const vnpayParams: VerifyReturnParams = {
            vnp_Amount: searchParams.get("vnp_Amount") || "",
            vnp_BankCode: searchParams.get("vnp_BankCode") || "",
            vnp_BankTranNo: searchParams.get("vnp_BankTranNo") || undefined,
            vnp_CardType: searchParams.get("vnp_CardType") || undefined,
            vnp_OrderInfo: searchParams.get("vnp_OrderInfo") || "",
            vnp_PayDate: searchParams.get("vnp_PayDate") || "",
            vnp_ResponseCode: searchParams.get("vnp_ResponseCode") || "",
            vnp_TmnCode: searchParams.get("vnp_TmnCode") || "",
            vnp_TransactionNo: searchParams.get("vnp_TransactionNo") || "",
            vnp_TransactionStatus: searchParams.get("vnp_TransactionStatus") || "",
            vnp_TxnRef: searchParams.get("vnp_TxnRef") || "",
            vnp_SecureHash: searchParams.get("vnp_SecureHash") || "",
        }

        // Verify the payment
        const result = verifyReturnUrl(vnpayParams)

        const supabase = await createClient()

        // Find the purchase record
        const { data: purchase, error: findError } = await supabase
            .from("purchases")
            .select("*, subscription_id, package_id")
            .eq("payment_id", result.orderId)
            .single()

        if (findError || !purchase) {
            console.error("Purchase not found:", result.orderId)
            return redirectToResult(request, false, "Không tìm thấy đơn hàng")
        }

        // Update purchase status
        const newStatus = result.isSuccess && result.isValidSignature ? "completed" : "failed"

        await supabase
            .from("purchases")
            .update({
                payment_status: newStatus,
                payment_data: vnpayParams,
                completed_at: result.isSuccess ? new Date().toISOString() : null,
            })
            .eq("id", purchase.id)

        // If successful, activate subscription or grant package access
        if (result.isSuccess && result.isValidSignature) {
            // Activate subscription
            if (purchase.subscription_id) {
                await supabase
                    .from("user_subscriptions")
                    .update({
                        status: "active",
                        started_at: new Date().toISOString(),
                    })
                    .eq("id", purchase.subscription_id)
            }

            return redirectToResult(request, true, "Thanh toán thành công!")
        } else {
            // Cancel pending subscription
            if (purchase.subscription_id) {
                await supabase
                    .from("user_subscriptions")
                    .update({ status: "cancelled" })
                    .eq("id", purchase.subscription_id)
            }

            return redirectToResult(request, false, result.message)
        }

    } catch (error) {
        console.error("Payment callback error:", error)
        return redirectToResult(request, false, "Lỗi xử lý thanh toán")
    }
}

function redirectToResult(request: NextRequest, success: boolean, message: string): NextResponse {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    const redirectUrl = new URL("/payment/result", baseUrl)
    redirectUrl.searchParams.set("success", success.toString())
    redirectUrl.searchParams.set("message", message)

    return NextResponse.redirect(redirectUrl)
}
