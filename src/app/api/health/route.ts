import { NextResponse } from "next/server"

/**
 * GET /api/health — lightweight uptime probe (no auth).
 * Checks env presence + optional Supabase reachability.
 */
export async function GET() {
  const started = Date.now()
  const checks: Record<string, "ok" | "skip" | "fail"> = {
    env_supabase: "fail",
    env_service_role: "fail",
    supabase_rest: "skip",
    redis: "skip",
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && anon) checks.env_supabase = "ok"
  if (service) checks.env_service_role = "ok"

  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
        signal: AbortSignal.timeout(4000),
      })
      // Supabase may return 200 or 401/404 depending on project — treat network success as ok
      checks.supabase_rest = res.status < 500 ? "ok" : "fail"
    } catch {
      checks.supabase_rest = "fail"
    }
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    checks.redis = "ok"
  }

  const healthy =
    checks.env_supabase === "ok" &&
    checks.env_service_role === "ok" &&
    checks.supabase_rest !== "fail"

  return NextResponse.json(
    {
      ok: healthy,
      service: "studyhub",
      latency_ms: Date.now() - started,
      checks,
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
