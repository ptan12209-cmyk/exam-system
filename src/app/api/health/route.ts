import { NextResponse } from "next/server"

/**
 * GET /api/health — lightweight uptime probe (no auth).
 * Returns a generic status only; never discloses which env secrets exist.
 */
export async function GET() {
  let supabaseReachable = false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
        signal: AbortSignal.timeout(4000),
      })
      // Supabase may return 200 or 401/404 depending on project — treat network success as ok
      supabaseReachable = res.status < 500
    } catch {
      supabaseReachable = false
    }
  }

  const healthy =
    Boolean(url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    supabaseReachable

  return NextResponse.json(
    {
      ok: healthy,
      ts: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
