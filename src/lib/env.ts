import { z } from 'zod'

/**
 * Environment variable schema for ExamHub.
 *
 * Required vars cause a fatal startup error if missing.
 * Optional vars are validated only when present.
 */
const envSchema = z.object({
  // ── Required ──
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Must be a valid URL'),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1, 'Required'),
  TURNSTILE_SECRET_KEY: z.string().min(1, 'Required'),
  NEXT_PUBLIC_VNPAY_TMN_CODE: z.string().min(1, 'Required'),
  VNPAY_HASH_SECRET: z.string().min(1, 'Required'),
  NEXT_PUBLIC_GEMINI_API_KEY: z.string().min(1, 'Required'),

  // ── Optional ──
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url('Must be a valid URL').optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Must be a valid URL').optional(),
  ANALYZE: z.enum(['true', 'false']).optional(),
})

/** Inferred type for validated env – use throughout the app. */
export type Env = z.infer<typeof envSchema>

/**
 * Validates `process.env` against the env schema.
 *
 * @throws {Error} If any required vars are missing or invalid.
 *                The message lists every failing variable.
 * @returns    A fully-typed `Env` object.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `  • ${issue.path.join('.')}: ${issue.message}`
    )
    throw new Error(
      `❌ Invalid environment variables:\n${issues.join('\n')}`
    )
  }

  return result.data
}
