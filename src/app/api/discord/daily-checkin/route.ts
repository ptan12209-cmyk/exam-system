import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Utility to calculate level from XP
function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

// Replicating check_and_unlock_achievements in TypeScript to bypass RPC RLS block
async function checkAndUnlockAchievements(userId: string, stats: any) {
  // Get all achievements
  const { data: achievements } = await supabaseAdmin
    .from("achievements")
    .select("*")

  if (!achievements) return { unlocked: [], xp_earned: 0 }

  // Get already unlocked achievements
  const { data: userAchievements } = await supabaseAdmin
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)

  const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
  const newUnlockedNames: string[] = []
  let totalXpEarned = 0

  let currentStats = { ...stats }

  for (const achievement of achievements) {
    if (unlockedIds.has(achievement.id)) continue

    let shouldUnlock = false
    switch (achievement.condition_type) {
      case "exams_completed":
        shouldUnlock = (currentStats.exams_completed || 0) >= achievement.condition_value
        break
      case "streak_days":
        shouldUnlock = (currentStats.streak_days || 0) >= achievement.condition_value
        break
      case "perfect_scores":
        shouldUnlock = (currentStats.perfect_scores || 0) >= achievement.condition_value
        break
      case "total_xp":
        shouldUnlock = (currentStats.xp || 0) >= achievement.condition_value
        break
      case "level":
        shouldUnlock = (currentStats.level || 1) >= achievement.condition_value
        break
    }

    if (shouldUnlock) {
      // 1. Insert user achievement
      const { error: insertError } = await supabaseAdmin
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: achievement.id })
      
      if (!insertError) {
        newUnlockedNames.push(achievement.name)
        // 2. Award XP if any
        if (achievement.xp_reward > 0) {
          totalXpEarned += achievement.xp_reward
          currentStats.xp += achievement.xp_reward
          currentStats.level = calculateLevel(currentStats.xp)

          await supabaseAdmin
            .from("student_stats")
            .update({ 
              xp: currentStats.xp,
              level: currentStats.level
            })
            .eq("user_id", userId)
        }
      }
    }
  }

  return {
    unlocked: newUnlockedNames,
    xp_earned: totalXpEarned
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { discord_id, secret_token } = body

    // 1. Authenticate using secret token
    const expectedToken = process.env.DISCORD_SYNC_SECRET || "discord_sync_secret_token_2026"
    if (secret_token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    if (!discord_id) {
      return NextResponse.json({ error: "Missing discord_id" }, { status: 400 })
    }

    // 2. Find student profile by discord_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("discord_id", discord_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Học sinh chưa liên kết tài khoản ExamHub." }, { status: 404 })
    }

    const todayStr = new Date().toISOString().split("T")[0]
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    // 3. Check if already checked in today
    const { data: todayLogin } = await supabaseAdmin
      .from("daily_logins")
      .select("*")
      .eq("user_id", profile.id)
      .eq("login_date", todayStr)
      .maybeSingle()

    let stats: any

    const { data: existingStats, error: statsError } = await supabaseAdmin
      .from("student_stats")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle()

    stats = existingStats

    if (todayLogin) {
      // Already checked in today, return status
      const currentLevel = stats?.level || 1
      const currentXp = stats?.xp || 0
      const nextLevelXp = Math.pow(currentLevel, 2) * 100

      return NextResponse.json({
        already_checked: true,
        streak: todayLogin.streak_day,
        xp_earned: 0,
        xp: currentXp,
        level: currentLevel,
        next_level_xp: nextLevelXp,
        newAchievements: [],
        achievementXp: 0
      })
    }

    // 4. Calculate streak
    const { data: yesterdayLogin } = await supabaseAdmin
      .from("daily_logins")
      .select("*")
      .eq("user_id", profile.id)
      .eq("login_date", yesterdayStr)
      .maybeSingle()

    const currentStreak = yesterdayLogin ? (yesterdayLogin.streak_day + 1) : 1
    const xpBonus = Math.min(10 + currentStreak * 2, 50)

    // 5. Insert login record
    const { error: insertLoginError } = await supabaseAdmin
      .from("daily_logins")
      .insert({
        user_id: profile.id,
        login_date: todayStr,
        xp_earned: xpBonus,
        streak_day: currentStreak
      })

    if (insertLoginError) {
      console.error("Insert login error:", insertLoginError)
      return NextResponse.json({ error: "Failed to save check-in login" }, { status: 500 })
    }

    // 6. Update student stats
    let newXp = xpBonus
    let newStreak = currentStreak
    let newLevel = 1

    if (stats) {
      newXp = stats.xp + xpBonus
      newStreak = currentStreak
      newLevel = calculateLevel(newXp)

      await supabaseAdmin
        .from("student_stats")
        .update({
          xp: newXp,
          streak_days: newStreak,
          level: newLevel,
          last_exam_date: todayStr
        })
        .eq("user_id", profile.id)
      
      stats.xp = newXp
      stats.streak_days = newStreak
      stats.level = newLevel
    } else {
      newLevel = calculateLevel(newXp)
      
      const { data: insertedStats } = await supabaseAdmin
        .from("student_stats")
        .insert({
          user_id: profile.id,
          xp: newXp,
          streak_days: newStreak,
          level: newLevel,
          last_exam_date: todayStr
        })
        .select()
        .single()
      
      stats = insertedStats
    }

    // 7. Check achievements
    const achievementResults = await checkAndUnlockAchievements(profile.id, stats)

    // Fetch final updated stats (in case achievements added more XP)
    const { data: finalStats } = await supabaseAdmin
      .from("student_stats")
      .select("xp, level")
      .eq("user_id", profile.id)
      .single()

    const finalLevel = finalStats?.level || newLevel
    const finalXp = finalStats?.xp || newXp
    const nextLevelXp = Math.pow(finalLevel, 2) * 100

    return NextResponse.json({
      already_checked: false,
      streak: newStreak,
      xp_earned: xpBonus,
      xp: finalXp,
      level: finalLevel,
      next_level_xp: nextLevelXp,
      newAchievements: achievementResults.unlocked,
      achievementXp: achievementResults.xp_earned
    })
  } catch (err) {
    console.error("Discord checkin API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
