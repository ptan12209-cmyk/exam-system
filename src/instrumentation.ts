import * as Sentry from "@sentry/nextjs"

/**
 * Next.js instrumentation hook (server + edge runtimes).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initServerSentry } = await import("./sentry.server.config")
    initServerSentry()
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    const { initEdgeSentry } = await import("./sentry.edge.config")
    initEdgeSentry()
  }
}

/**
 * Capture errors from nested React Server Components.
 */
export const onRequestError = Sentry.captureRequestError
