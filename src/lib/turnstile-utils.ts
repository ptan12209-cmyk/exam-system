/**
 * Turnstile configuration utilities.
 * Validates keys and warns when sandbox keys are used in production.
 *
 * Cloudflare Turnstile sandbox test keys (always pass verification):
 *   Site Key:   1x00000000000000000000AA
 *   Secret Key: 1x0000000000000000000000000000000AA
 *
 * Production keys: https://dash.cloudflare.com/turnstile
 */

const SANDBOX_SITE_KEY = '1x00000000000000000000AA'
const SANDBOX_SECRET_KEY = '1x0000000000000000000000000000000AA'

export function isSandboxSiteKey(key: string): boolean {
  return key === SANDBOX_SITE_KEY
}

export function isSandboxSecretKey(key: string): boolean {
  return key === SANDBOX_SECRET_KEY
}

export interface TurnstileValidation {
  siteKey: string
  secretKey: string
  warnings: string[]
  isProduction: boolean
}

export function validateTurnstileConfig(): TurnstileValidation {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
  const secretKey = process.env.TURNSTILE_SECRET_KEY || ''
  const isProduction = process.env.NODE_ENV === 'production'
  const warnings: string[] = []

  if (!siteKey) {
    warnings.push(
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. CAPTCHA will not render.'
    )
  } else if (isSandboxSiteKey(siteKey) && isProduction) {
    warnings.push(
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY is using Cloudflare sandbox test key. ' +
        'Replace with production key from https://dash.cloudflare.com/turnstile'
    )
  }

  if (!secretKey) {
    warnings.push(
      'TURNSTILE_SECRET_KEY is not set. Server-side verification will fail.'
    )
  } else if (isSandboxSecretKey(secretKey) && isProduction) {
    warnings.push(
      'TURNSTILE_SECRET_KEY is using Cloudflare sandbox test key. ' +
        'Replace with production key from https://dash.cloudflare.com/turnstile'
    )
  }

  return { siteKey, secretKey, warnings, isProduction }
}

/**
 * Validate and log warnings to console.
 * Call once on server startup (e.g., from instrumentation.ts).
 * In production, warnings are logged as errors to trigger alerts.
 * In development, warnings are logged as warnings for visibility.
 */
export function logTurnstileWarnings(): void {
  const { warnings, isProduction } = validateTurnstileConfig()
  if (warnings.length === 0) return

  if (isProduction) {
    console.error('[Turnstile] PRODUCTION CONFIG ISSUES:', warnings.join(' | '))
  } else {
    console.warn('[Turnstile] Development config notices:', warnings.join(' | '))
  }
}

/**
 * Server-side Turnstile token verification.
 * In production, missing secret or failed verify → false.
 * In development without secret, allows through (with warning).
 */
export async function verifyTurnstileToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.length < 10) {
    return false
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  const isProduction = process.env.NODE_ENV === 'production'

  if (!secretKey) {
    if (isProduction) {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY missing in production')
      return false
    }
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY not set, skipping verification (dev only)')
    return true
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = (await response.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('[Turnstile] verification failed:', error)
    return false
  }
}
