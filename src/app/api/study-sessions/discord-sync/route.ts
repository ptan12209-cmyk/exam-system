import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use supabase service_role key to bypass RLS policies for automatic proctoring updates
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const REQUIRED_MINUTES = 130 // 2 hours 10 minutes of active voice time is the threshold for a 2.5-hour class
const STREAK_THRESHOLD_MINUTES = 60 // Cần ít nhất 60 phút học thực chất để tính 1 ngày streak

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      discord_id, status, duration_seconds, deafened, muted_seconds, 
      sharing_screen, camera_on, sharing_screen_seconds, camera_seconds,
      secret_token 
    } = body

    // 1. Authenticate webhook secret — no hardcoded fallback
    const expectedToken = process.env.DISCORD_SYNC_SECRET
    if (!expectedToken || !secret_token || secret_token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    if (!discord_id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 2. Fetch student profile linked to this discord_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, discord_streak, last_discord_study_date")
      .eq("discord_id", discord_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "No student profile found with this Discord ID" }, { status: 404 })
    }

    const nowIso = new Date().toISOString()

    // Fetch existing study session to check for status changes and AFK alerts
    const { data: existingSession } = await supabaseAdmin
      .from("study_sessions")
      .select("status, last_status_change, active_alert")
      .eq("student_id", profile.id)
      .maybeSingle()

    let lastStatusChange = nowIso
    let activeAlert: string | null = null

    if (existingSession) {
      if (existingSession.status === status) {
        lastStatusChange = existingSession.last_status_change
        activeAlert = existingSession.active_alert
      } else {
        // Status changed, reset alert if changing away from afk/offline
        if (status !== 'discord_afk') {
          activeAlert = null
        }
      }
    }

    // Auto-alert check if AFK too long (> 10 minutes / 600 seconds)
    if (status === 'discord_afk') {
      const afkStartTime = new Date(lastStatusChange).getTime()
      const elapsedAfkSeconds = Math.floor((Date.now() - afkStartTime) / 1000)
      if (elapsedAfkSeconds >= 600) {
        activeAlert = "Bạn đã AFK trong phòng Discord quá 10 phút. Vui lòng bật lại tai nghe để tiếp tục học!"
      }
    } else if (status === 'offline') {
      activeAlert = null
    }

    // Update study session
    const { error: sessionError } = await supabaseAdmin
      .from("study_sessions")
      .upsert(
        {
          student_id: profile.id,
          status: status,
          last_status_change: lastStatusChange,
          discord_duration: duration_seconds || 0,
          discord_deafened: !!deafened,
          discord_sharing_screen: !!sharing_screen,
          discord_camera_on: !!camera_on,
          discord_last_active: nowIso,
          active_alert: activeAlert
        },
        {
          onConflict: "student_id"
        }
      )

    if (sessionError) {
      console.error("Error updating study session:", sessionError)
      return NextResponse.json({ error: "Failed to update study session" }, { status: 500 })
    }

    // 3.5. Manage discord attendance logs
    let { data: openLog } = await supabaseAdmin
      .from("discord_attendance_logs")
      .select("id, joined_at, total_active_seconds, total_afk_seconds, session_date")
      .eq("student_id", profile.id)
      .is("left_at", null)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Safety check: Auto-close ghost session if it is from a previous calendar day 
    // or is older than 12 hours.
    const todayStr = new Date().toISOString().split('T')[0]
    if (openLog) {
      const logJoinedTime = new Date(openLog.joined_at).getTime()
      const isTooOld = Date.now() - logJoinedTime > 12 * 60 * 60 * 1000 // 12 hours
      const isDifferentDay = openLog.session_date !== todayStr

      if (isTooOld || isDifferentDay) {
        console.log(`[GHOST SESSION AUTO-CLOSE] Closing open log ${openLog.id} from day ${openLog.session_date}`)
        const activeSec = openLog.total_active_seconds || 0
        const afkSec = openLog.total_afk_seconds || 0
        const autoLeftAt = new Date(logJoinedTime + (activeSec + afkSec) * 1000).toISOString()
        
        await supabaseAdmin
          .from("discord_attendance_logs")
          .update({ left_at: autoLeftAt })
          .eq("id", openLog.id)
          
        openLog = null
      }
    }

    const mutedSecs = typeof muted_seconds === 'number' ? Math.max(0, muted_seconds) : 0
    const screenSecs = typeof sharing_screen_seconds === 'number' ? Math.max(0, sharing_screen_seconds) : 0
    const cameraSecs = typeof camera_seconds === 'number' ? Math.max(0, camera_seconds) : 0

    if (status !== 'offline') {
      if (!openLog) {
        const joinedAtDate = duration_seconds
          ? new Date(Date.now() - (duration_seconds * 1000))
          : new Date()
        
        await supabaseAdmin
          .from("discord_attendance_logs")
          .insert({
            student_id: profile.id,
            discord_id: discord_id,
            joined_at: joinedAtDate.toISOString(),
            session_date: new Date().toISOString().split('T')[0],
            total_active_seconds: duration_seconds || 0,
            total_afk_seconds: 0,
            total_muted_seconds: mutedSecs,
            total_sharing_screen_seconds: screenSecs,
            total_camera_seconds: cameraSecs
          })
      } else {
        const joinedAt = new Date(openLog.joined_at)
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 1000))
        const activeSeconds = duration_seconds || 0
        const afkSeconds = Math.max(0, elapsedSeconds - activeSeconds)

        await supabaseAdmin
          .from("discord_attendance_logs")
          .update({
            total_active_seconds: activeSeconds,
            total_afk_seconds: afkSeconds,
            total_muted_seconds: mutedSecs,
            total_sharing_screen_seconds: screenSecs,
            total_camera_seconds: cameraSecs
          })
          .eq("id", openLog.id)
      }
    } else {
      // Kết thúc phiên học (offline) → đóng log và tính streak
      if (openLog) {
        const joinedAt = new Date(openLog.joined_at)
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - joinedAt.getTime()) / 1000))
        const activeSeconds = duration_seconds || 0
        const afkSeconds = Math.max(0, elapsedSeconds - activeSeconds)

        await supabaseAdmin
          .from("discord_attendance_logs")
          .update({
            left_at: nowIso,
            total_active_seconds: activeSeconds,
            total_afk_seconds: afkSeconds,
            total_muted_seconds: mutedSecs,
            total_sharing_screen_seconds: screenSecs,
            total_camera_seconds: cameraSecs
          })
          .eq("id", openLog.id)
      }

      // Tính toán streak khi học sinh offline
      await updateStreak(profile)
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

// Tính toán và cập nhật chuỗi ngày học streak
async function updateStreak(profile: { id: string; discord_streak: number | null; last_discord_study_date: string | null }) {
  const todayStr = new Date().toISOString().split('T')[0]

  // Lấy tổng thời gian học thực trong ngày hôm nay
  const { data: todayLogs } = await supabaseAdmin
    .from("discord_attendance_logs")
    .select("total_active_seconds, total_muted_seconds")
    .eq("student_id", profile.id)
    .eq("session_date", todayStr)

  if (!todayLogs || todayLogs.length === 0) return

  const totalActiveToday = todayLogs.reduce((sum, log) => sum + (log.total_active_seconds || 0), 0)
  const totalMutedToday = todayLogs.reduce((sum, log) => sum + (log.total_muted_seconds || 0), 0)
  const effectiveMinutes = Math.max(0, totalActiveToday - totalMutedToday) / 60

  if (effectiveMinutes < STREAK_THRESHOLD_MINUTES) return

  const currentStreak = profile.discord_streak || 0
  const lastDate = profile.last_discord_study_date

  let newStreak = 1

  if (lastDate) {
    if (lastDate === todayStr) {
      // Đã tính streak cho ngày hôm nay rồi → giữ nguyên
      return
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (lastDate === yesterdayStr) {
      // Học liên tiếp → tăng streak
      newStreak = currentStreak + 1
    }
    // Ngược lại (quá 1 ngày) → reset về 1
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      discord_streak: newStreak,
      last_discord_study_date: todayStr
    })
    .eq("id", profile.id)
}
