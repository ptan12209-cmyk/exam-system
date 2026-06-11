import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("student_id")
    const fromDate = searchParams.get("from")
    const toDate = searchParams.get("to")

    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id parameter" }, { status: 400 })
    }

    let query = supabase
      .from("discord_attendance_logs")
      .select("*")
      .eq("student_id", studentId)

    if (fromDate) {
      query = query.gte("session_date", fromDate)
    }
    if (toDate) {
      query = query.lte("session_date", toDate)
    }

    const { data: logs, error } = await query
      .order("session_date", { ascending: true })
      .order("joined_at", { ascending: true })

    if (error) {
      console.error("Error querying discord logs:", error)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({ success: true, logs: logs || [] })
  } catch (error) {
    console.error("discord-history API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
