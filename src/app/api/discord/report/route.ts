import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const secret_token = searchParams.get("secret_token") || req.headers.get("Authorization")?.replace("Bearer ", "")

    // 1. Authenticate secret token
    const expectedToken = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026"
    if (secret_token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const todayStr = new Date().toISOString().split("T")[0]

    // 2. Fetch today's attendance logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("discord_attendance_logs")
      .select("*, profile:profiles(full_name)")
      .eq("session_date", todayStr)

    if (logsError) {
      console.error("Error fetching report logs:", logsError)
      return NextResponse.json({ error: "Failed to fetch logs: " + logsError.message }, { status: 500 })
    }

    const totalSessions = logs.length
    const uniqueStudents = new Set(logs.map(l => l.student_id)).size
    
    let totalActiveSeconds = 0
    let totalAfkSeconds = 0
    const studentReportMap = new Map<string, {
      discord_id: string
      full_name: string
      active_seconds: number
      afk_seconds: number
      afk_violations: number
    }>()

    logs.forEach(log => {
      totalActiveSeconds += log.total_active_seconds || 0
      totalAfkSeconds += log.total_afk_seconds || 0
      
      const profile = Array.isArray(log.profile) ? log.profile[0] : log.profile
      const name = profile?.full_name || "Học sinh"

      const existing = studentReportMap.get(log.student_id)
      if (existing) {
        existing.active_seconds += log.total_active_seconds || 0
        existing.afk_seconds += log.total_afk_seconds || 0
        if (log.total_afk_seconds > 0) {
          existing.afk_violations += 1
        }
      } else {
        studentReportMap.set(log.student_id, {
          discord_id: log.discord_id,
          full_name: name,
          active_seconds: log.total_active_seconds || 0,
          afk_seconds: log.total_afk_seconds || 0,
          afk_violations: log.total_afk_seconds > 0 ? 1 : 0
        })
      }
    })

    const students = Array.from(studentReportMap.values())
    const avgDurationMinutes = totalSessions > 0 ? Math.round((totalActiveSeconds / totalSessions) / 60) : 0

    return NextResponse.json({
      success: true,
      date: todayStr,
      total_sessions: totalSessions,
      active_students_count: uniqueStudents,
      avg_duration_minutes: avgDurationMinutes,
      students: students
    })
  } catch (err) {
    console.error("Discord report API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
