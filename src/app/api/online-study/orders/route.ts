import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse } from "@/lib/api-utils"

// GET /api/online-study/orders
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Kiểm tra vai trò người dùng
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "teacher" || profile?.role === "admin"
  const adminSupabase = createAdminClient()

  if (isAdmin) {
    // Admin lấy toàn bộ danh sách đơn hàng kèm email học sinh
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

    // Tính tổng doanh thu thành công
    const revenue = (orders || [])
      .filter(o => o.status === "success")
      .reduce((sum, o) => sum + Number(o.amount), 0)

    return NextResponse.json(successResponse({ orders: orders || [], revenue }))
  } else {
    // Học sinh chỉ lấy đơn hàng của chính mình
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
}

// POST /api/online-study/orders
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { subjectKey, amount, memo } = body

  if (!subjectKey || !amount || !memo) {
    return NextResponse.json({ error: "Thiếu thông tin tạo đơn hàng" }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Tạo một hóa đơn mới trạng thái pending
  const { data: order, error } = await adminSupabase
    .from("online_orders")
    .insert({
      student_id: user.id,
      subject_key: subjectKey,
      amount,
      memo,
      status: "pending"
    })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(successResponse(order))
}

// PUT /api/online-study/orders
async function handlePUT(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  const body = await request.json()
  const { orderId, status } = body

  if (!orderId || !status) {
    return NextResponse.json({ error: "Thiếu orderId hoặc status" }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Lấy chi tiết đơn hàng trước khi xử lý
  const { data: order, error: getError } = await adminSupabase
    .from("online_orders")
    .select("student_id, subject_key, status")
    .eq("id", orderId)
    .single()

  if (getError) throw getError

  // Nếu chuyển trạng thái sang thành công
  if (status === "success" && order.status !== "success") {
    // 1. Cập nhật trạng thái đơn hàng
    const { error: updateError } = await adminSupabase
      .from("online_orders")
      .update({ status: "success" })
      .eq("id", orderId)

    if (updateError) throw updateError

    // 2. Cấp quyền môn học cho học viên
    const { error: permissionError } = await adminSupabase
      .from("student_online_subjects")
      .upsert({
        student_id: order.student_id,
        subject: order.subject_key,
        assigned_by: user.id
      }, {
        onConflict: "student_id,subject"
      })

    // Đừng lo nếu bị trùng quyền hoặc trùng bản ghi, upsert với unique constraint student_id, subject sẽ xử lý mượt mà.

    // 3. Đồng bộ vai trò học sinh từ student sang online_student
    const { data: currentProfile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", order.student_id)
      .single()

    if (currentProfile && currentProfile.role === "student") {
      await adminSupabase
        .from("profiles")
        .update({ role: "online_student" })
        .eq("id", order.student_id)
    }
  } else {
    // Nếu chuyển sang trạng thái khác (ví dụ: failed)
    const { error: updateError } = await adminSupabase
      .from("online_orders")
      .update({ status })
      .eq("id", orderId)

    if (updateError) throw updateError
  }

  return NextResponse.json(successResponse({ success: true, message: "Cập nhật trạng thái đơn hàng thành công" }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
export const PUT = withErrorHandler(handlePUT)
