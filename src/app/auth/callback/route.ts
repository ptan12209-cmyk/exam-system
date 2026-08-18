import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Magic-link / recovery callback. Public OAuth provisioning is intentionally
 * disabled: only an already-active, teacher-issued account may continue.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const requestedNext = searchParams.get("next") || "/student/dashboard"

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

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!existing || existing.account_status !== "active") {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=account_disabled`)
  }

  if (requestedNext === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  const safeStudentNext =
    requestedNext.startsWith("/student/") || requestedNext.startsWith("/arena")
      ? requestedNext
      : "/student/dashboard"
  const dest =
    existing.role === "teacher" || existing.role === "admin"
      ? "/teacher/dashboard"
      : safeStudentNext

  return NextResponse.redirect(`${origin}${dest}`)
}
