import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserStats } from "@/lib/gamification"

import { NotificationsClient } from "./NotificationsClient"

/**
 * Server Component — notifications arrive pre-rendered in the HTML.
 * Read-state mutations stay client-side (optimistic) in NotificationsClient.
 */
export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [profileResult, statsResult, notifResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getUserStats(user.id, supabase),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <NotificationsClient
      fullName={profileResult.data?.full_name || ""}
      studentStats={statsResult.stats}
      initialNotifications={notifResult.data ?? []}
    />
  )
}
