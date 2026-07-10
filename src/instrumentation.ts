/**
 * Next.js instrumentation — runs once when the Node server starts.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only validate on Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'edge') return

  try {
    const { validateEnv } = await import('@/lib/env')
    validateEnv()
    console.log('[instrumentation] Environment variables validated')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
      // Fail loud in production so misconfig is obvious in logs
      throw err
    }
    console.warn('[instrumentation] Env validation warning (dev):\n', message)
  }

  try {
    const { logTurnstileWarnings } = await import('@/lib/turnstile-utils')
    logTurnstileWarnings()
  } catch {
    /* optional */
  }
}
