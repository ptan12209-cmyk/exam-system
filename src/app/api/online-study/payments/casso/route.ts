import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { checkRateLimit, getClientIP } from "@/lib/rate-limit"
import { safeEqualSecret } from "@/lib/online-study-auth"
import {
  parseCassoTransactions,
  processCassoTransaction,
  type CassoWebhookBody,
} from "@/lib/casso-webhook"

/**
 * Casso bank webhook — auto-unlock online-study orders when VietQR transfer arrives.
 *
 * Configure on my.casso.vn → Settings → Integration → Webhook:
 *   URL:    https://YOUR_DOMAIN/api/online-study/payments/casso
 *   Header: secure-token = value of env CASSO_SECURE_TOKEN
 *
 * Docs: https://developer.casso.vn/english-v2-new/webhook/thiet-lap-webhook-thu-cong
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const rate = await checkRateLimit(`casso-webhook:${ip}`, 120, 60)
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 })
    }

    const expected = process.env.CASSO_SECURE_TOKEN || ""
    if (!expected) {
      console.error("[casso] CASSO_SECURE_TOKEN is not configured")
      return NextResponse.json({ success: false, error: "not_configured" }, { status: 503 })
    }

    // Casso sends security key in header "secure-token"
    const provided =
      request.headers.get("secure-token") ||
      request.headers.get("Secure-Token") ||
      request.headers.get("x-casso-secure-token") ||
      ""

    if (!safeEqualSecret(provided, expected)) {
      console.warn("[casso] invalid secure-token")
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as CassoWebhookBody | null
    if (!body) {
      return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
    }

    // error field: 0 means OK in Casso samples
    if (body.error !== undefined && body.error !== 0 && body.error !== "0") {
      console.warn("[casso] payload error field", body.error)
      return NextResponse.json({ success: true, message: "ignored_error_payload" })
    }

    const transactions = parseCassoTransactions(body)
    if (transactions.length === 0) {
      // Test call may send empty — acknowledge so Casso marks OK
      return NextResponse.json({ success: true, message: "no_transactions" })
    }

    const adminSupabase = createAdminClient()
    const results = []

    for (const tx of transactions) {
      const r = await processCassoTransaction(adminSupabase, tx)
      results.push({ cassoId: tx.id, ...r })
    }

    // Always 200 + success:true so Casso strict mode stops retrying
    // (failed match still OK — money arrived but no order / already handled)
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("[casso] webhook error", error)
    // Return 200 with success:false only if strict mode needs retry; prefer 500 for real bugs
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 })
  }
}

/** Health / docs for teacher setup */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "casso-webhook",
    path: "/api/online-study/payments/casso",
    header: "secure-token",
    env: "CASSO_SECURE_TOKEN",
  })
}
