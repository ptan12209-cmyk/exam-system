import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { requireAuth, requireRole } from "@/lib/auth-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate (Either via Discord Bot Secret Token or Teacher Cookie Session)
    let isAuthorized = false
    const authHeader = req.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    const expectedToken = process.env.DISCORD_SYNC_SECRET
    
    if (expectedToken && token && token === expectedToken) {
      isAuthorized = true
    } else {
      // Try cookie-based session auth
      try {
        const supabase = await createServerClient()
        const user = await requireAuth(supabase)
        await requireRole(supabase, user.id, ["teacher", "admin", "parent"])
        isAuthorized = true
      } catch (err) {
        // Not authorized
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Calculate Start of Week (Monday 00:00:00)
    const now = new Date()
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay() // 0 = Sunday, 1 = Monday, ...
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    // 3. Fetch attendance logs from Monday to now
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("discord_attendance_logs")
      .select(`
        student_id,
        total_active_seconds,
        profiles:student_id ( full_name, class )
      `)
      .gte("joined_at", startOfWeek.toISOString())

    if (logsError) {
      console.error("Error fetching weekly top logs:", logsError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // 4. Aggregate active seconds by student
    const aggregationMap: Record<string, { student_id: string; full_name: string; class: string; total_seconds: number }> = {}

    for (const log of logs || []) {
      const studentId = log.student_id
      const activeSeconds = log.total_active_seconds || 0
      
      const profile = (log.profiles as any) || {}
      const fullName = profile.full_name || "Chưa rõ tên"
      const className = profile.class || "Chưa rõ lớp"

      if (!aggregationMap[studentId]) {
        aggregationMap[studentId] = {
          student_id: studentId,
          full_name: fullName,
          class: className,
          total_seconds: 0
        }
      }
      aggregationMap[studentId].total_seconds += activeSeconds
    }

    // 5. Sort descending and limit to top 5
    const topList = Object.values(aggregationMap)
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 5)

    return NextResponse.json({
      success: true,
      start_of_week: startOfWeek.toISOString(),
      top_list: topList
    })
  } catch (error: any) {
    console.error("Top-weekly route handler error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
