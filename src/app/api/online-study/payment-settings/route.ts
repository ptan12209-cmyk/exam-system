import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { withErrorHandler, successResponse } from "@/lib/api-utils"
import { ONLINE_SUBJECTS } from "@/lib/subjects"

// Mặc định ban đầu nếu bảng chưa được tạo hoặc chưa có bản ghi
const DEFAULT_PAYMENT_SETTINGS = {
  bankId: "MB",
  accountNo: "0348574888",
  accountName: "STUDYHUB EDUCATION",
  prices: ONLINE_SUBJECTS.reduce((acc, sub) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - price field was added during refactor
    acc[sub.value] = sub.price || 299000
    return acc
  }, {} as Record<string, number>)
}

// GET /api/online-study/payment-settings
async function handleGET(request: NextRequest) {
  const supabase = await createClient()
  
  // Cho phép người dùng đã xác thực (Học sinh và Giáo viên) đọc cấu hình
  await requireAuth(supabase)

  const adminSupabase = createAdminClient()

  // Truy vấn bản ghi cấu hình trong bảng settings
  const { data, error } = await adminSupabase
    .from("payment_settings")
    .select("value")
    .eq("key", "settings")
    .maybeSingle()

  if (error) {
    // Nếu bảng chưa được tạo (chưa chạy migration), trả về cấu hình mặc định thay vì báo lỗi crash
    if (error.code === "P0001" || error.message?.includes("relation") || error.message?.includes("does not exist")) {
      return NextResponse.json(successResponse(DEFAULT_PAYMENT_SETTINGS))
    }
    throw error
  }

  const settings = data?.value || DEFAULT_PAYMENT_SETTINGS
  return NextResponse.json(successResponse(settings))
}

// POST /api/online-study/payment-settings
async function handlePOST(request: NextRequest) {
  const supabase = await createClient()
  const user = await requireAuth(supabase)
  
  // Chỉ giáo viên hoặc admin mới được lưu cấu hình
  await requireRole(supabase, user.id, ["teacher", "admin"])

  const body = await request.json()
  const { bankId, accountNo, accountName, prices } = body

  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from("payment_settings")
    .upsert({
      key: "settings",
      value: { bankId, accountNo, accountName, prices }
    })

  if (error) throw error

  return NextResponse.json(successResponse({ success: true, message: "Cập nhật cấu hình thanh toán thành công" }))
}

export const GET = withErrorHandler(handleGET)
export const POST = withErrorHandler(handlePOST)
