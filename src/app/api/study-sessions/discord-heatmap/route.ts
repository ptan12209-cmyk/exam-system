import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import { handleApiError } from "@/lib/api-utils"

// Lấy dữ liệu discord attendance logs 30 ngày gần nhất, nhóm theo ngày trong tuần + khung giờ
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await requireAuth(supabase)
    await requireRole(supabase, user.id, ["teacher", "admin", "parent"])

    const studentId = req.nextUrl.searchParams.get("student_id")
    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    // Lấy dữ liệu 30 ngày gần nhất
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: logs, error } = await supabase
      .from("discord_attendance_logs")
      .select("session_date, joined_at, total_active_seconds, total_afk_seconds, total_muted_seconds")
      .eq("student_id", studentId)
      .gte("session_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("session_date", { ascending: true })

    if (error) {
      console.error("Heatmap query error:", error)
      return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 })
    }

    // Nhóm theo ngày trong tuần (0=CN, 1-6=T2-T7) và khung giờ (sáng/chiều/tối/đêm)
    const heatmap: Record<string, number> = {}

    for (const log of logs || []) {
      const date = new Date(log.joined_at)
      // Cộng 7 giờ để đồng bộ múi giờ Việt Nam (UTC+7)
      const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000)
      
      const dayOfWeek = vnTime.getUTCDay() // 0-6 (Chủ nhật - Thứ 7)
      const hour = vnTime.getUTCHours() // 0-23

      // Xác định khung giờ: 0=sáng(6-12), 1=chiều(12-18), 2=tối(18-24), 3=đêm(0-6)
      let slot: number
      if (hour >= 6 && hour < 12) slot = 0
      else if (hour >= 12 && hour < 18) slot = 1
      else if (hour >= 18) slot = 2
      else slot = 3

      const key = `${dayOfWeek}-${slot}`
      const activeMinutes = Math.round((log.total_active_seconds || 0) / 60)
      heatmap[key] = (heatmap[key] || 0) + activeMinutes
    }

    // Lấy streak hiện tại của học sinh
    const { data: profile } = await supabase
      .from("profiles")
      .select("discord_streak, last_discord_study_date")
      .eq("id", studentId)
      .single()

    return NextResponse.json({
      success: true,
      heatmap,
      streak: profile?.discord_streak || 0,
      last_study_date: profile?.last_discord_study_date || null
    })
  } catch (error) {
    const { response, status } = handleApiError(error)
    return NextResponse.json(response, { status })
  }
}
