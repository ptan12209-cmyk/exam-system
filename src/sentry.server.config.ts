import * as Sentry from "@sentry/nextjs"

/**
 * Server (Node.js runtime) error tracking.
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is configured.
 */
export function initServerSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
  })
}
