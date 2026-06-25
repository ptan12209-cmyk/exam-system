import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { handleApiError } from "@/lib/api-utils"

// API cho giáo viên gửi nhắc nhở đến học sinh qua Discord Bot DM
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth(supabase)
    await requireRole(supabase, user.id, ["teacher", "admin"])

    const body = await req.json()
    const { student_id, message } = body

    if (!student_id || !message?.trim()) {
      return NextResponse.json({ error: "Thiếu student_id hoặc nội dung tin nhắn" }, { status: 400 })
    }

    // Lấy discord_id của học sinh
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("discord_id, full_name")
      .eq("id", student_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 })
    }

    if (!profile.discord_id) {
      return NextResponse.json({ error: "Học sinh chưa liên kết tài khoản Discord" }, { status: 400 })
    }

    // Gửi yêu cầu đến Express server của Bot Discord
    const botApiUrl = process.env.DISCORD_BOT_API_URL || "http://localhost:8080"
    const botSecret = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026"

    const botResponse = await fetch(`${botApiUrl}/api/send-dm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_id: profile.discord_id,
        message: message.trim(),
        secret_token: botSecret
      })
    })

    if (!botResponse.ok) {
      const errData = await botResponse.json().catch(() => ({}))
      console.error("Bot DM error:", errData)
      return NextResponse.json({ error: "Không thể gửi tin nhắn qua Bot Discord" }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      student_name: profile.full_name,
      message: "Đã gửi nhắc nhở thành công"
    })
  } catch (error) {
    const { response, status } = handleApiError(error)
    return NextResponse.json(response, { status })
  }
}
