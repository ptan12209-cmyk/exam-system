import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * OAuth / magic-link callback — exchange code, ensure profile for Google users.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/online-student/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* Server Component edge */
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    console.error("[auth/callback]", error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const user = data.user
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const meta = user.user_metadata || {}
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (user.email?.split("@")[0] ?? "Học viên")
  const email = (user.email || "").toLowerCase()
  const isGoogle =
    user.app_metadata?.provider === "google" ||
    (Array.isArray(user.app_metadata?.providers) &&
      user.app_metadata.providers.includes("google"))

  const { data: existing } = await admin
    .from("profiles")
    .select("id, role, account_source, email_verified_at")
    .eq("id", user.id)
    .maybeSingle()

  if (!existing) {
    await admin.from("profiles").upsert(
      {
        id: user.id,
        role: "student",
        full_name: fullName,
        email,
        account_source: isGoogle ? "google" : "self_register",
        email_verified_at: isGoogle ? now : null,
      },
      { onConflict: "id" }
    )
  } else if (isGoogle && !existing.email_verified_at) {
    await admin
      .from("profiles")
      .update({
        account_source: "google",
        email_verified_at: now,
        email: email || undefined,
      })
      .eq("id", user.id)
  }

  const role = existing?.role || "student"
  const dest =
    role === "teacher"
      ? "/teacher/online-study"
      : next.startsWith("/")
        ? next
        : "/online-student/dashboard"

  return NextResponse.redirect(`${origin}${dest}`)
}
