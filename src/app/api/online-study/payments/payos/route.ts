import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { checkRateLimit, getClientIP } from "@/lib/rate-limit"
import {
  getPayosConfig,
  verifyPayosWebhookSignature,
  confirmPayosWebhook,
} from "@/lib/payos"
import { fulfillOnlineOrderSuccess } from "@/lib/online-order-fulfill"

/**
 * payOS payment webhook
 * URL for merchant portal / confirm-webhook:
 *   https://luyende.id.vn/api/online-study/payments/payos
 *
 * Body sample:
 * { code, desc, success, data: { orderCode, amount, ... }, signature }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const rate = await checkRateLimit(`payos-webhook:${ip}`, 120, 60)
    if (!rate.allowed) {
      return NextResponse.json({ success: false }, { status: 429 })
    }

    const { checksumKey, configured } = getPayosConfig()
    if (!configured) {
      console.error("[payOS webhook] credentials missing")
      return NextResponse.json({ success: false, error: "not_configured" }, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "invalid_body" }, { status: 400 })
    }

    const data = body.data as Record<string, unknown> | undefined
    const signature = String(body.signature || "")

    if (!data || typeof data !== "object") {
      // payOS may ping with empty payload during setup
      return NextResponse.json({ success: true, message: "no_data" })
    }

    if (!verifyPayosWebhookSignature(data, signature, checksumKey)) {
      console.warn("[payOS webhook] invalid signature")
      return NextResponse.json({ success: false, error: "invalid_signature" }, { status: 401 })
    }

    const orderCode = Number(data.orderCode)
    const amount = Math.round(Number(data.amount))
    const code = String(data.code || body.code || "")
    const ok =
      body.success === true ||
      code === "00" ||
      String(body.code) === "00"

    if (!Number.isFinite(orderCode)) {
      return NextResponse.json({ success: true, message: "no_order_code" })
    }

    if (!ok) {
      console.warn("[payOS webhook] payment not success", { orderCode, code })
      return NextResponse.json({ success: true, message: "payment_not_success" })
    }

    const adminSupabase = createAdminClient()
    const { data: order, error } = await adminSupabase
      .from("online_orders")
      .select("id, amount, status")
      .eq("payment_order_code", orderCode)
      .maybeSingle()

    if (error || !order) {
      console.warn("[payOS webhook] order not found for orderCode", orderCode, error)
      // Still 200 so payOS stops retrying unknown/test payloads
      return NextResponse.json({ success: true, message: "order_not_found" })
    }

    const expectedAmount = Math.round(Number(order.amount))
    if (Number.isFinite(amount) && amount > 0 && amount !== expectedAmount) {
      console.error("[payOS webhook] amount mismatch", {
        orderCode,
        amount,
        expectedAmount,
      })
      return NextResponse.json({ success: true, message: "amount_mismatch" })
    }

    const fulfilled = await fulfillOnlineOrderSuccess(adminSupabase, order.id, {
      assignedBy: null,
      expectedAmountVnd: expectedAmount,
    })

    if (!fulfilled.ok) {
      console.error("[payOS webhook] fulfill failed", fulfilled.reason, order.id)
      return NextResponse.json({ success: true, message: fulfilled.reason })
    }

    return NextResponse.json({
      success: true,
      message: fulfilled.alreadyDone ? "already_unlocked" : "unlocked",
      subjectKey: fulfilled.subjectKey,
    })
  } catch (e) {
    console.error("[payOS webhook]", e)
    return NextResponse.json({ success: false, error: "internal" }, { status: 500 })
  }
}

/**
 * GET: health + optional ?confirm=1 to register webhook URL with payOS
 * Teacher/admin only for confirm — uses service credentials server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const confirm = searchParams.get("confirm") === "1"
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://luyende.id.vn"
  const webhookUrl = `${base.replace(/\/$/, "")}/api/online-study/payments/payos`

  if (!confirm) {
    return NextResponse.json({
      ok: true,
      service: "payos-webhook",
      webhookUrl,
      env: ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"],
      hint: "Add ?confirm=1 with secret query to register webhook (see code)",
    })
  }

  // Protect confirm with shared secret so random visitors cannot re-register
  const setupSecret = process.env.PAYOS_SETUP_SECRET || process.env.CASSO_SECURE_TOKEN || ""
  const provided = searchParams.get("secret") || ""
  if (!setupSecret || provided !== setupSecret) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 })
  }

  const result = await confirmPayosWebhook(webhookUrl)
  return NextResponse.json({
    ...result,
    webhookUrl,
  })
}
