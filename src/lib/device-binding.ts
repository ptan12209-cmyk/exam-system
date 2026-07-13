import type { SupabaseClient } from "@supabase/supabase-js"
import { ApiError } from "@/lib/api-utils"
import { SINGLE_DEVICE_ENABLED } from "@/lib/features"
import {
  DEVICE_ID_COOKIE,
  DEVICE_ID_HEADER,
  isValidDeviceId,
} from "@/lib/device-id"

export { DEVICE_ID_COOKIE, DEVICE_ID_HEADER, isValidDeviceId }

const STAFF_ROLES = new Set(["teacher", "admin"])

export function extractDeviceIdFromRequest(request: Request): string | null {
  const header = request.headers.get(DEVICE_ID_HEADER)?.trim()
  if (isValidDeviceId(header)) return header

  const cookieHeader = request.headers.get("cookie") || ""
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${DEVICE_ID_COOKIE}=([^;]+)`)
  )
  if (!match?.[1]) return null
  try {
    const value = decodeURIComponent(match[1].trim())
    return isValidDeviceId(value) ? value : null
  } catch {
    return null
  }
}

export async function getProfileRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()
  return data?.role ?? null
}

export function isStaffRole(role: string | null | undefined): boolean {
  return !!role && STAFF_ROLES.has(role)
}

export type BindDeviceResult = {
  bound: boolean
  replaced: boolean
  deviceId: string
  deviceLabel: string | null
}

/**
 * Set (or replace) the single active device for a user.
 * Uses service-role client — bypasses RLS write lock.
 */
export async function bindDevicePrimary(
  admin: SupabaseClient,
  userId: string,
  deviceId: string,
  meta?: { deviceLabel?: string | null; userAgent?: string | null }
): Promise<BindDeviceResult> {
  if (!isValidDeviceId(deviceId)) {
    throw new ApiError("BAD_REQUEST", "Mã thiết bị không hợp lệ", 400)
  }

  const { data: existing } = await admin
    .from("user_device_bindings")
    .select("device_id")
    .eq("user_id", userId)
    .maybeSingle()

  const replaced = !!(existing?.device_id && existing.device_id !== deviceId)
  const now = new Date().toISOString()

  const { error } = await admin.from("user_device_bindings").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      device_label: meta?.deviceLabel?.slice(0, 120) || null,
      user_agent: meta?.userAgent?.slice(0, 400) || null,
      bound_at: now,
      last_seen_at: now,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[device-binding] upsert failed", error)
    throw new ApiError(
      "DEVICE_BIND_FAILED",
      "Không ghi được thiết bị. Thầy cần chạy migration SQL single-device.",
      500
    )
  }

  return {
    bound: true,
    replaced,
    deviceId,
    deviceLabel: meta?.deviceLabel?.slice(0, 120) || null,
  }
}

export async function clearDeviceBinding(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await admin
    .from("user_device_bindings")
    .delete()
    .eq("user_id", userId)
  if (error) {
    console.error("[device-binding] clear failed", error)
    throw new ApiError("DEVICE_RESET_FAILED", "Không reset được thiết bị", 500)
  }
}

export type VerifyDeviceResult =
  | { ok: true; status: "match" | "bound" | "skipped_staff" | "disabled" }
  | { ok: false; code: "DEVICE_REQUIRED" | "DEVICE_CONFLICT"; message: string }

/**
 * Soft verify for UI polling (does not throw).
 */
export async function verifyDeviceBinding(
  admin: SupabaseClient,
  userId: string,
  deviceId: string | null,
  options?: { role?: string | null; autoBindIfMissing?: boolean; userAgent?: string | null; deviceLabel?: string | null }
): Promise<VerifyDeviceResult> {
  if (!SINGLE_DEVICE_ENABLED) {
    return { ok: true, status: "disabled" }
  }

  let role = options?.role
  if (role === undefined) {
    role = await getProfileRole(admin, userId)
  }
  if (isStaffRole(role)) {
    return { ok: true, status: "skipped_staff" }
  }

  if (!isValidDeviceId(deviceId)) {
    return {
      ok: false,
      code: "DEVICE_REQUIRED",
      message: "Thiếu mã thiết bị. Vui lòng đăng nhập lại.",
    }
  }

  const { data: binding, error } = await admin
    .from("user_device_bindings")
    .select("device_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    // Table missing / migration not run — fail open with log (avoid total lockout)
    console.error("[device-binding] verify select failed", error)
    return { ok: true, status: "disabled" }
  }

  if (!binding) {
    if (options?.autoBindIfMissing !== false) {
      await bindDevicePrimary(admin, userId, deviceId, {
        deviceLabel: options?.deviceLabel,
        userAgent: options?.userAgent,
      })
      return { ok: true, status: "bound" }
    }
    return {
      ok: false,
      code: "DEVICE_REQUIRED",
      message: "Chưa gắn thiết bị. Vui lòng đăng nhập lại.",
    }
  }

  if (binding.device_id !== deviceId) {
    return {
      ok: false,
      code: "DEVICE_CONFLICT",
      message:
        "Tài khoản đang được dùng trên thiết bị khác. Mỗi tài khoản chỉ được 1 thiết bị. Liên hệ thầy nếu cần reset.",
    }
  }

  // Touch last_seen (best-effort)
  void admin
    .from("user_device_bindings")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)

  return { ok: true, status: "match" }
}

/**
 * Hard gate for student content APIs. Throws ApiError on conflict.
 */
export async function requireSingleDevice(
  request: Request,
  admin: SupabaseClient,
  userId: string,
  options?: { role?: string | null }
): Promise<void> {
  if (!SINGLE_DEVICE_ENABLED) return

  let role = options?.role
  if (role === undefined) {
    role = await getProfileRole(admin, userId)
  }
  if (isStaffRole(role)) return

  const deviceId = extractDeviceIdFromRequest(request)
  const result = await verifyDeviceBinding(admin, userId, deviceId, {
    role,
    autoBindIfMissing: true,
    userAgent: request.headers.get("user-agent"),
  })

  if (!result.ok) {
    throw new ApiError(result.code, result.message, result.code === "DEVICE_CONFLICT" ? 409 : 403)
  }
}
