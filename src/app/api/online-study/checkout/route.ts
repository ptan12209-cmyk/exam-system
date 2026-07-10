import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth } from "@/lib/auth-utils"
import { withErrorHandler, ApiError } from "@/lib/api-utils"

/**
 * POST /api/online-study/checkout
 *
 * Previously unlocked subjects without payment verification (critical vulnerability).
 * Free self-unlock is permanently disabled. Students must create a pending order
 * via POST /api/online-study/orders; teachers approve via PUT.
 */
async function handlePOST(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  await requireAuth(supabase)

  throw new ApiError(
    "CHECKOUT_DISABLED",
    "Tự mở khóa không còn được hỗ trợ. Vui lòng tạo đơn chuyển khoản và chờ giáo viên duyệt.",
    403
  )
}

export const POST = withErrorHandler(handlePOST)
