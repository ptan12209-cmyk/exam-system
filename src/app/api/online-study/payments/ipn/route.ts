import { NextRequest, NextResponse } from "next/server"
import {
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  IpnSuccess,
  IpnUnknownError,
  InpOrderAlreadyConfirmed,
} from "vnpay"
import { vnpayParamsFromSearchParams } from "@/lib/vnpay"
import { processOnlineStudyVnpayPayment } from "@/lib/online-study-vnpay"
import { checkRateLimit, getClientIP } from "@/lib/rate-limit"

/**
 * VNPay IPN (server-to-server).
 * Configure in VNPay merchant portal:
 *   https://your-domain/api/online-study/payments/ipn
 *
 * Response body must be JSON: { RspCode, Message } for VNPay to stop retrying.
 */
async function handleIpn(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const rate = await checkRateLimit(`vnpay-ipn:${ip}`, 120, 60)
    if (!rate.allowed) {
      return NextResponse.json(IpnUnknownError)
    }

    // VNPay may GET or POST query params
    let searchParams = request.nextUrl.searchParams
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || ""
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await request.text()
        searchParams = new URLSearchParams(text)
      } else if (contentType.includes("application/json")) {
        const body = await request.json().catch(() => ({}))
        searchParams = new URLSearchParams()
        for (const [k, v] of Object.entries(body as Record<string, string>)) {
          if (v != null) searchParams.set(k, String(v))
        }
      }
      // merge URL query if present
      request.nextUrl.searchParams.forEach((v, k) => {
        if (!searchParams.has(k)) searchParams.set(k, v)
      })
    }

    const params = vnpayParamsFromSearchParams(searchParams)
    const outcome = await processOnlineStudyVnpayPayment(params, "ipn")

    switch (outcome.kind) {
      case "fulfilled":
        // Already confirmed is still success for VNPay (stop retries)
        if (outcome.alreadyDone) {
          return NextResponse.json(InpOrderAlreadyConfirmed)
        }
        return NextResponse.json(IpnSuccess)
      case "invalid_signature":
        return NextResponse.json(IpnFailChecksum)
      case "order_not_found":
        return NextResponse.json(IpnOrderNotFound)
      case "failed":
        if (outcome.reason === "AMOUNT_MISMATCH") {
          return NextResponse.json(IpnInvalidAmount)
        }
        return NextResponse.json(IpnUnknownError)
      case "payment_not_success":
        // Acknowledge so VNPay stops retrying failed user payments
        return NextResponse.json(IpnSuccess)
      default:
        return NextResponse.json(IpnUnknownError)
    }
  } catch (error) {
    console.error("[online-study/payments/ipn]", error)
    return NextResponse.json(IpnUnknownError)
  }
}

export async function GET(request: NextRequest) {
  return handleIpn(request)
}

export async function POST(request: NextRequest) {
  return handleIpn(request)
}
