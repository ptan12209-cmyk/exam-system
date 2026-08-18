import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "PUBLIC_REGISTRATION_DISABLED",
        message: "Tài khoản học sinh chỉ được tạo và cấp bởi giáo viên.",
      },
    },
    { status: 403 }
  )
}
