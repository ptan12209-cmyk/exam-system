import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import {
  buildOrderMemo,
  generatePaymentCode,
  getServerSubjectPrice,
  isValidOnlineSubjectKey,
} from "@/lib/online-study-auth"
import { fulfillOnlineOrderSuccess } from "@/lib/online-order-fulfill"
import {
  createPayosPaymentLink,
  generatePayosOrderCode,
  getPayosConfig,
} from "@/lib/payos"

// GET /api/online-study/orders
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "teacher" || profile?.role === "admin"
  const adminSupabase = createAdminClient()

  if (isAdmin) {
    const { data: orders, error } = await adminSupabase
      .from("online_orders")
      .select(`
        id,
        subject_key,
        amount,
        memo,
        status,
        created_at,
        student:profiles!student_id(id, full_name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
        return NextResponse.json(successResponse({ orders: [], revenue: 0 }))
      }
      throw error
    }

    const revenue = (orders || [])
      .filter((o) => o.status === "success")
      .reduce((sum, o) => sum + Number(o.amount), 0)

    return NextResponse.json(successResponse({ orders: orders || [], revenue }))
  }

  // Students: own orders only
  const { data: orders, error } = await adminSupabase
    .from("online_orders")
    .select("id, subject_key, amount, memo, status, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      return NextResponse.json(successResponse({ orders: [] }))
    }
    throw error
  }

  return NextResponse.json(successResponse({ orders: orders || [] }))
}

// POST /api/online-study/orders — create pending invoice (server-side price + memo)
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const ip = getClientIP(request)
  const rate = await checkRateLimit(`orders-create:${user.id}:${ip}`, 10, 60)
  if (!rate.allowed) {
    return rateLimitResponse({
      success: false,
      limit: 10,
      remaining: rate.remaining,
      resetTime: rate.reset * 1000,
    })
  }

  const body = await request.json().catch(() => ({}))
  const subjectKey = typeof body.subjectKey === "string" ? body.subjectKey.trim() : ""

  if (!subjectKey || !isValidOnlineSubjectKey(subjectKey)) {
    throw new ApiError("BAD_REQUEST", "Mã môn học không hợp lệ", 400)
  }

  const adminSupabase = createAdminClient()

  // Already unlocked?
  const { data: existing } = await adminSupabase
    .from("student_online_subjects")
    .select("id")
    .eq("student_id", user.id)
    .eq("subject", subjectKey)
    .maybeSingle()

  if (existing) {
    throw new ApiError("ALREADY_UNLOCKED", "Môn học đã được mở khóa", 400)
  }

  // Pending order for same subject?
  let pending: {
    id: string
    subject_key: string
    amount: number
    memo: string
    status: string
    created_at: string
    payment_order_code?: number | null
    payment_link_id?: string | null
    payment_provider?: string | null
  } | null = null

  {
    const withCols = await adminSupabase
      .from("online_orders")
      .select(
        "id, subject_key, amount, memo, status, created_at, payment_order_code, payment_link_id, payment_provider"
      )
      .eq("student_id", user.id)
      .eq("subject_key", subjectKey)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (withCols.error) {
      const plain = await adminSupabase
        .from("online_orders")
        .select("id, subject_key, amount, memo, status, created_at")
        .eq("student_id", user.id)
        .eq("subject_key", subjectKey)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      pending = plain.data
    } else {
      pending = withCols.data
    }
  }

  const amount = await getServerSubjectPrice(adminSupabase, subjectKey)

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", user.id)
    .single()

  let order = pending as {
    id: string
    subject_key: string
    amount: number
    memo: string
    status: string
    created_at: string
    payment_order_code?: number | null
    payment_link_id?: string | null
    payment_provider?: string | null
  } | null

  if (!order) {
    const paymentCode = generatePaymentCode(6)
    const memo = buildOrderMemo(profile?.email || user.email, subjectKey, paymentCode)
    const paymentOrderCode = generatePayosOrderCode()

    const insertPayload: Record<string, unknown> = {
      student_id: user.id,
      subject_key: subjectKey,
      amount,
      memo,
      status: "pending",
      payment_order_code: paymentOrderCode,
      payment_provider: getPayosConfig().configured ? "payos" : "vietqr",
    }

    const { data: created, error } = await adminSupabase
      .from("online_orders")
      .insert(insertPayload)
      .select(
        "id, subject_key, amount, memo, status, created_at, payment_order_code, payment_link_id, payment_provider"
      )
      .single()

    // If migration not applied yet, retry without payOS columns
    if (error) {
      console.warn("[orders] insert with payOS columns failed, retry plain", error.message)
      const { data: created2, error: err2 } = await adminSupabase
        .from("online_orders")
        .insert({
          student_id: user.id,
          subject_key: subjectKey,
          amount,
          memo,
          status: "pending",
        })
        .select("id, subject_key, amount, memo, status, created_at")
        .single()
      if (err2) throw err2
      order = created2 as {
        id: string
        subject_key: string
        amount: number
        memo: string
        status: string
        created_at: string
        payment_order_code?: number | null
        payment_link_id?: string | null
        payment_provider?: string | null
      }
    } else {
      order = created
    }
  }

  if (!order) {
    throw new ApiError("INTERNAL_ERROR", "Không tạo được đơn hàng", 500)
  }

  // Free subject → unlock immediately
  if (Number(order.amount) === 0) {
    const fulfilled = await fulfillOnlineOrderSuccess(adminSupabase, order.id, {
      assignedBy: user.id,
      expectedAmountVnd: 0,
    })
    if (!fulfilled.ok) {
      throw new ApiError("FULFILL_FAILED", "Không thể kích hoạt môn miễn phí", 500)
    }
    return NextResponse.json(
      successResponse({
        ...order,
        status: "success",
        free: true,
        unlocked: true,
      })
    )
  }

  // payOS auto-unlock via webhook (preferred)
  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://luyende.id.vn"
  ).replace(/\/$/, "")

  const payosCfg = getPayosConfig()
  if (payosCfg.configured) {
    let orderCode = order.payment_order_code
      ? Number(order.payment_order_code)
      : generatePayosOrderCode()

    if (!order.payment_order_code) {
      await adminSupabase
        .from("online_orders")
        .update({
          payment_order_code: orderCode,
          payment_provider: "payos",
        })
        .eq("id", order.id)
    }

    // Short description (payOS limit ~9 for some bank links)
    const shortDesc = (order.memo.split(" ").pop() || generatePaymentCode(6)).slice(0, 9)

    const payos = await createPayosPaymentLink({
      orderCode,
      amount: Math.round(Number(order.amount)),
      description: shortDesc,
      returnUrl: `${baseUrl}/payment/result?flow=online-study&success=true&subject=${encodeURIComponent(subjectKey)}`,
      cancelUrl: `${baseUrl}/payment/result?flow=online-study&success=false`,
      buyerName: profile?.full_name || undefined,
      buyerEmail: profile?.email || user.email || undefined,
    })

    if (payos.success) {
      if (payos.paymentLinkId) {
        await adminSupabase
          .from("online_orders")
          .update({
            payment_link_id: payos.paymentLinkId,
            payment_provider: "payos",
            payment_order_code: orderCode,
          })
          .eq("id", order.id)
      }

      // VietQR image from payOS bank account if available
      let vietQrUrl: string | null = null
      if (payos.bin && payos.accountNumber) {
        const addInfo = encodeURIComponent(payos.description || shortDesc)
        const accName = encodeURIComponent(payos.accountName || "")
        vietQrUrl = `https://img.vietqr.io/image/${payos.bin}-${payos.accountNumber}-print.png?amount=${payos.amount || order.amount}&addInfo=${addInfo}&accountName=${accName}`
      }

      return NextResponse.json(
        successResponse({
          ...order,
          payment_order_code: orderCode,
          paymentMethod: "payos",
          checkoutUrl: payos.checkoutUrl || null,
          qrCode: payos.qrCode || null,
          vietQrUrl,
          accountNumber: payos.accountNumber || null,
          accountName: payos.accountName || null,
          bin: payos.bin || null,
          payosDescription: payos.description || shortDesc,
        })
      )
    }

    console.warn("[orders] payOS create failed, fallback VietQR", payos.error)
  }

  // Fallback: teacher bank settings + manual / Casso path
  return NextResponse.json(
    successResponse({
      ...order,
      paymentMethod: "vietqr",
    })
  )
}

// PUT /api/online-study/orders — teacher/admin only approve/reject
async function handlePUT(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json().catch(() => ({}))
  const orderId = typeof body.orderId === "string" ? body.orderId : ""
  const status = body.status as string

  if (!orderId || !status) {
    throw new ApiError("BAD_REQUEST", "Thiếu orderId hoặc status", 400)
  }

  if (status !== "success" && status !== "failed") {
    throw new ApiError("BAD_REQUEST", "Trạng thái không hợp lệ (success|failed)", 400)
  }

  const adminSupabase = createAdminClient()

  const { data: order, error: getError } = await adminSupabase
    .from("online_orders")
    .select("id, student_id, subject_key, status")
    .eq("id", orderId)
    .single()

  if (getError || !order) {
    throw new ApiError("NOT_FOUND", "Không tìm thấy đơn hàng", 404)
  }

  // Idempotent: already success
  if (order.status === "success") {
    return NextResponse.json(
      successResponse({ success: true, message: "Đơn hàng đã được duyệt trước đó" })
    )
  }

  // Only allow transitions from pending
  if (order.status !== "pending") {
    throw new ApiError(
      "INVALID_TRANSITION",
      `Không thể chuyển đơn từ ${order.status} sang ${status}`,
      400
    )
  }

  if (status === "success") {
    const result = await fulfillOnlineOrderSuccess(adminSupabase, orderId, {
      assignedBy: user.id,
    })
    if (!result.ok) {
      throw new ApiError("FULFILL_FAILED", result.reason, 400)
    }
  } else {
    const { error: updateError } = await adminSupabase
      .from("online_orders")
      .update({ status: "failed" })
      .eq("id", orderId)
      .eq("status", "pending")

    if (updateError) throw updateError
  }

  return NextResponse.json(
    successResponse({ success: true, message: "Cập nhật trạng thái đơn hàng thành công" })
  )
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const PUT = withErrorHandler(handlePUT)
