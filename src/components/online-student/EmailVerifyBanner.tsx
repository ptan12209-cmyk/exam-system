"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  getGraceDaysRemaining,
  needsVerificationBanner,
  type VerifyProfileFields,
} from "@/lib/email-verify"
import { Mail } from "lucide-react"

export function EmailVerifyBanner() {
  const [profile, setProfile] = useState<VerifyProfileFields | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from("profiles")
        .select("email_verified_at, account_source, created_at, role")
        .eq("id", user.id)
        .single()
      if (!cancelled) setProfile(data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (hidden || !needsVerificationBanner(profile)) return null

  const days = getGraceDaysRemaining(profile?.created_at)

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-sm">
        <p className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Mail className="h-4 w-4 shrink-0" />
          <span>
            Xác thực email
            {days !== null && days >= 0 ? ` trong ${days} ngày` : ""} để bảo vệ tài khoản.
          </span>
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/verify-email"
            className="font-semibold text-amber-950 underline-offset-4 hover:underline dark:text-amber-50"
          >
            Xác thực ngay
          </Link>
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="text-xs text-amber-800/70 dark:text-amber-200/70"
          >
            Ẩn
          </button>
        </div>
      </div>
    </div>
  )
}
