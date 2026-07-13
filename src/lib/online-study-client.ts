/**
 * Browser helpers for online-study student calls.
 * Always attach device id so requireSingleDevice can pass.
 * Keep free of Node-only imports (no crypto / server modules).
 */

import {
  DEVICE_ID_HEADER,
  getOrCreateDeviceId,
  syncDeviceIdCookie,
} from "@/lib/device-id"
import { ONLINE_SUBJECTS } from "@/lib/subjects"

/** Ensure cookie + return headers for authenticated online-study API calls. */
export function onlineStudyHeaders(extra?: HeadersInit): Headers {
  const id = getOrCreateDeviceId()
  syncDeviceIdCookie(id)
  const headers = new Headers(extra)
  if (id) headers.set(DEVICE_ID_HEADER, id)
  return headers
}

/** fetch() wrapper that injects x-device-id for student APIs. */
export function onlineStudyFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
    headers: onlineStudyHeaders(init?.headers),
  })
}

/** Catalog ↔ DB subject aliases (mirrors expandSubjectAliases, client-safe). */
function subjectAliases(subjectKey: string): string[] {
  const byValue = ONLINE_SUBJECTS.find((s) => s.value === subjectKey)
  if (byValue) return Array.from(new Set([byValue.value, byValue.dbValue]))
  const byDb = ONLINE_SUBJECTS.find((s) => s.dbValue === subjectKey)
  if (byDb) return Array.from(new Set([byDb.value, byDb.dbValue]))
  return [subjectKey]
}

/** True if unlocked list grants access to catalog subject key (toan, ly, …). */
export function hasOnlineSubjectAccess(
  unlocked: string[],
  subjectKey: string
): boolean {
  if (unlocked.includes("all")) return true
  if (unlocked.includes(subjectKey)) return true
  return subjectAliases(subjectKey).some((a) => unlocked.includes(a))
}
