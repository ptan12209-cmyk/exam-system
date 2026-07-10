import { z } from 'zod'

/**
 * Environment variable schema for ExamHub (online-study focused).
 * Required vars cause a fatal startup error if missing in production.
 */
const envSchema = z.object({
  // ── Required ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Must be a valid URL').optional(),

  // ── Optional integrations ──
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  VNPAY_TMN_CODE: z.string().optional(),
  VNPAY_SECURE_SECRET: z.string().optional(),
  VNPAY_HASH_SECRET: z.string().optional(),
  DISCORD_SYNC_SECRET: z.string().optional(),
  DISCORD_BOT_API_URL: z.string().optional(),
  PYTHON_WORKER_URL: z.string().optional(),
  NEXT_PUBLIC_WORKER_URL: z.string().optional(),
  /** Server-only Gemini key — never NEXT_PUBLIC_ */
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SEED_ROUTE_SECRET: z.string().optional(),
  /** Casso webhook header secure-token (legacy) */
  CASSO_SECURE_TOKEN: z.string().optional(),
  /** payOS (Casso) merchant keys */
  PAYOS_CLIENT_ID: z.string().optional(),
  PAYOS_API_KEY: z.string().optional(),
  PAYOS_CHECKSUM_KEY: z.string().optional(),
  PAYOS_SETUP_SECRET: z.string().optional(),
  /** Bunny Stream token security key (optional — signs embed URLs) */
  BUNNY_STREAM_TOKEN_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validates process.env. In production, throws if core Supabase vars missing.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `  • ${issue.path.join('.')}: ${issue.message}`
    )
    throw new Error(`❌ Invalid environment variables:\n${issues.join('\n')}`)
  }

  if (process.env.NODE_ENV === 'production') {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ] as const
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      throw new Error(`❌ Missing production env: ${missing.join(', ')}`)
    }
  }

  return result.data
}
