import { NextRequest, NextResponse } from "next/server"
import { vnpayParamsFromSearchParams } from "@/lib/vnpay"
import { processOnlineStudyVnpayPayment } from "@/lib/online-study-vnpay"

/**
 * VNPay return URL (browser redirect) for online-study purchases.
 * Prefer also configuring IPN URL → /api/online-study/payments/ipn
 */
export async function GET(request: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin

  const redirect = (success: boolean, message: string, subjectKey?: string) => {
    const url = new URL("/payment/result", baseUrl)
    url.searchParams.set("success", success ? "true" : "false")
    url.searchParams.set("message", message)
    url.searchParams.set("flow", "online-study")
    if (subjectKey) url.searchParams.set("subject", subjectKey)
    return NextResponse.redirect(url)
  }

  try {
    const params = vnpayParamsFromSearchParams(request.nextUrl.searchParams)
    const outcome = await processOnlineStudyVnpayPayment(params, "return")

    if (outcome.kind === "fulfilled") {
      return redirect(
        true,
        outcome.alreadyDone
          ? "Môn học đã được mở khóa trước đó."
          : "Thanh toán thành công! Môn học đã được mở khóa tự động.",
        outcome.subjectKey
      )
    }

    return redirect(false, outcome.message)
  } catch (error) {
    console.error("[online-study/payments/callback]", error)
    return redirect(false, "Lỗi xử lý thanh toán")
  }
}
