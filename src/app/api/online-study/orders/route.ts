import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse, ApiError } from "@/lib/api-utils"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import {
  buildOrderMemo,
  getServerSubjectPrice,
  isValidOnlineSubjectKey,
} from "@/lib/online-study-auth"
import { fulfillOnlineOrderSuccess } from "@/lib/online-order-fulfill"

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
  const { data: pending } = await adminSupabase
    .from("online_orders")
    .select("id, subject_key, amount, memo, status, created_at")
    .eq("student_id", user.id)
    .eq("subject_key", subjectKey)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const amount = await getServerSubjectPrice(adminSupabase, subjectKey)

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single()

  const memo = buildOrderMemo(profile?.email || user.email, subjectKey)

  let order = pending

  if (!order) {
    const { data: created, error } = await adminSupabase
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

    if (error) throw error
    order = created
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

  // Paid: VietQR bank transfer only (VNPay temporarily disabled for online-study).
  // Teacher approves via PUT when transfer is confirmed.
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
