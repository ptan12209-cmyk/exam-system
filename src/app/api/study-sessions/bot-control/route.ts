import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { handleApiError } from "@/lib/api-utils"

// API cho giáo viên điều khiển Bot Discord (lấy status hoặc di chuyển phòng)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth(supabase)
    await requireRole(supabase, user.id, ["teacher", "admin"])

    const body = await req.json()
    const { command, discord_id, student_id } = body

    if (!command) {
      return NextResponse.json({ error: "Thiếu lệnh điều khiển (command)" }, { status: 400 })
    }

    let targetDiscordId = discord_id

    // Nếu truyền student_id, truy vấn tìm discord_id của học sinh
    if (student_id && !targetDiscordId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", student_id)
        .single()
      
      targetDiscordId = profile?.discord_id
    }

    if (command === "move_to_afk" && !targetDiscordId) {
      return NextResponse.json({ error: "Học sinh này chưa liên kết tài khoản Discord" }, { status: 400 })
    }

    // Gửi yêu cầu đến Express server của Bot Discord
    const botApiUrl = process.env.DISCORD_BOT_API_URL || "http://localhost:8080"
    const botSecret = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026"

    const botResponse = await fetch(`${botApiUrl}/api/bot-control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command,
        discord_id: targetDiscordId,
        secret_token: botSecret
      })
    })

    if (!botResponse.ok) {
      const errData = await botResponse.json().catch(() => ({}))
      console.error("Bot control error:", errData)
      return NextResponse.json({ error: errData.error || "Không thể kết nối với Bot Discord" }, { status: 502 })
    }

    const data = await botResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    const { response, status } = handleApiError(error)
    return NextResponse.json(response, { status })
  }
}
