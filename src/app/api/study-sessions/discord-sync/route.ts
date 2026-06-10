import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use supabase service_role key to bypass RLS policies for automatic proctoring updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const REQUIRED_MINUTES = 130 // 2 hours 10 minutes of active voice time is the threshold for a 2.5-hour class

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { discord_id, status, duration_seconds, deafened, secret_token } = body

    // 1. Authenticate webhook secret
    const expectedToken = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026"
    if (secret_token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    if (!discord_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 2. Fetch student profile linked to this discord_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("discord_id", discord_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "No student profile found with this Discord ID" }, { status: 404 })
    }

    const nowIso = new Date().toISOString()

    // 3. Update or Insert the study_sessions row
    // Note: status is either 'discord_class', 'discord_afk', or 'offline'
    const { error: sessionError } = await supabaseAdmin
      .from("study_sessions")
      .upsert(
        {
          student_id: profile.id,
          status: status,
          last_status_change: nowIso,
          discord_duration: duration_seconds || 0,
          discord_deafened: !!deafened,
          discord_last_active: nowIso
        },
        {
          onConflict: "student_id"
        }
      )

    if (sessionError) {
      console.error("Error updating study session:", sessionError)
      return NextResponse.json({ error: "Failed to update study session" }, { status: 500 })
    }

    // 4. Auto-complete the ca học task if study duration meets the threshold
    const durationMinutes = (duration_seconds || 0) / 60
    let taskCompleted = false

    if (durationMinutes >= REQUIRED_MINUTES) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      // Check if a task with the same title was already created today
      const { data: existingTask } = await supabaseAdmin
        .from("study_tasks")
        .select("id")
        .eq("student_id", profile.id)
        .eq("title", "Tham gia ca học Discord (150 phút)")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .maybeSingle()

      if (existingTask) {
        await supabaseAdmin
          .from("study_tasks")
          .update({
            is_completed: true,
            status: "done",
            completed_at: nowIso
          })
          .eq("id", existingTask.id)
      } else {
        await supabaseAdmin
          .from("study_tasks")
          .insert({
            student_id: profile.id,
            title: "Tham gia ca học Discord (150 phút)",
            description: `Tự động hoàn thành sau khi tham gia ca dạy thoại trên Discord đủ thời lượng (${Math.round(durationMinutes)} phút).`,
            subject: "Discord",
            priority: "high",
            status: "done",
            is_completed: true,
            completed_at: nowIso
          })
      }
      taskCompleted = true
    }

    return NextResponse.json({
      success: true,
      student_name: profile.full_name,
      status: status,
      duration_minutes: durationMinutes,
      task_completed: taskCompleted
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("Discord sync API error:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
