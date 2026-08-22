import * as Sentry from "@sentry/nextjs"

/**
 * Client-side error tracking (loaded automatically by Next.js).
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
    sendDefaultPii: false,
    // Exam sessions are sensitive — never attach page payloads automatically
    beforeSend(event) {
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>
        if ("image_base64" in data || "mc_answers" in data || "sa_answers" in data) {
          delete event.request.data
        }
      }
      return event
    },
  })
}
