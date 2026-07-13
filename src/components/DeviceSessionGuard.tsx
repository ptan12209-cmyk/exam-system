"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  getDeviceLabel,
  getOrCreateDeviceId,
  syncDeviceIdCookie,
} from "@/lib/device-id"

const SKIP_PREFIXES = [
  "/",
  "/landing",
  "/login",
  "/register",
  "/pricing",
]

function shouldSkipPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/landing") return true
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return true
  // Public marketing only
  if (pathname.startsWith("/landing")) return true
  return false
}

/**
 * Ensures student accounts stay on a single active device.
 * Polls /api/auth/device/verify; on conflict, signs out.
 */
export function DeviceSessionGuard() {
  const pathname = usePathname()
  const router = useRouter()
  const kicking = useRef(false)

  useEffect(() => {
    if (shouldSkipPath(pathname || "/")) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    async function kick(message?: string) {
      if (kicking.current || cancelled) return
      kicking.current = true
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        /* ignore */
      }
      const q = new URLSearchParams()
      q.set("error", "device_kicked")
      if (message) q.set("msg", message.slice(0, 160))
      router.replace(`/login?${q.toString()}`)
    }

    async function verifyOnce() {
      if (cancelled || kicking.current) return
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const deviceId = getOrCreateDeviceId()
        syncDeviceIdCookie(deviceId)

        const res = await fetch("/api/auth/device/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId,
          },
          body: JSON.stringify({
            deviceId,
            deviceLabel: getDeviceLabel(),
          }),
          credentials: "same-origin",
        })

        if (res.status === 409 || res.status === 403) {
          const data = await res.json().catch(() => null)
          const code = data?.error?.code
          if (code === "DEVICE_CONFLICT" || code === "DEVICE_REQUIRED") {
            await kick(data?.error?.message)
          }
          return
        }
      } catch {
        /* network blip — retry next interval */
      }
    }

    void verifyOnce()
    timer = setInterval(() => void verifyOnce(), 45_000)

    const onVis = () => {
      if (document.visibilityState === "visible") void verifyOnce()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [pathname, router])

  return null
}
