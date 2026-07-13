/**
 * Client-side stable device id (localStorage + cookie mirror for API checks).
 */

export const DEVICE_ID_STORAGE_KEY = "studyhub_device_id"
export const DEVICE_ID_COOKIE = "sh_device_id"
export const DEVICE_ID_HEADER = "x-device-id"

const DEVICE_ID_RE = /^[a-zA-Z0-9_-]{16,128}$/

export function isValidDeviceId(id: string | null | undefined): id is string {
  return typeof id === "string" && DEVICE_ID_RE.test(id)
}

/** Generate or reuse a long-lived device id for this browser profile. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return ""

  let id = ""
  try {
    id = localStorage.getItem(DEVICE_ID_STORAGE_KEY) || ""
  } catch {
    id = ""
  }

  if (!isValidDeviceId(id)) {
    const a =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    const b =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2)
    id = `${a}${b}`.slice(0, 48)
    try {
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id)
    } catch {
      /* private mode */
    }
  }

  syncDeviceIdCookie(id)
  return id
}

export function syncDeviceIdCookie(deviceId: string) {
  if (typeof document === "undefined" || !isValidDeviceId(deviceId)) return
  document.cookie = `${DEVICE_ID_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

/** Short human-readable label for teacher support. */
export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown"
  const ua = navigator.userAgent || ""
  let browser = "Browser"
  if (/Edg\//i.test(ua)) browser = "Edge"
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari"

  let os = "Unknown OS"
  if (/Windows/i.test(ua)) os = "Windows"
  else if (/Android/i.test(ua)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS"
  else if (/Mac OS X/i.test(ua)) os = "macOS"
  else if (/Linux/i.test(ua)) os = "Linux"

  return `${browser} · ${os}`
}

/** Headers to attach on authenticated API calls from the browser. */
export function deviceIdHeaders(): HeadersInit {
  const id = getOrCreateDeviceId()
  return id ? { [DEVICE_ID_HEADER]: id } : {}
}
