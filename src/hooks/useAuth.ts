"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Represents the authenticated user from Supabase Auth.
 */
export interface AuthUser {
  /** Unique user ID from Supabase Auth. */
  id: string
  /** User email, if available. */
  email?: string
}

/**
 * Represents the user's profile record from the profiles table.
 */
export interface Profile {
  /** Profile ID (matches Auth user ID). */
  id: string
  /** User role: 'student', 'teacher', or 'admin'. */
  role: string
  /** Display name, null if not set. */
  full_name: string | null
  /** Class/group identifier, null if not set. */
  class: string | null
  /** Grade identifier (6-12), null if not set. */
  grade: number | null
  /** Specific class suffix (e.g. A1, B2), null if not set. */
  class_suffix: string | null
}

interface UseAuthOptions {
  /** Whether to redirect to /login when no user is authenticated. Default true. */
  requireAuth?: boolean
  /** If set, redirect to /login when the profile role doesn't match. */
  requiredRole?: string
}

/**
 * Hook for authentication state and profile loading.
 * On mount, checks Supabase Auth session and fetches the user's profile.
 * Redirects to /login if unauthenticated (unless requireAuth is false)
 * or if the user's role doesn't match requiredRole.
 *
 * @param options - Configuration for auth requirements and role checks.
 * @returns Object containing user, profile, loading state, and signOut function.
 */
export function useAuth(options?: UseAuthOptions) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchAuth() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        if (options?.requireAuth !== false) {
          router.push("/login")
        }
        if (!cancelled) setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, role, full_name, class, grade, class_suffix")
        .eq("id", authUser.id)
        .single()

      if (cancelled) return

      setUser({ id: authUser.id, email: authUser.email })
      setProfile(profileData as Profile | null)

      if (options?.requiredRole && profileData?.role !== options.requiredRole) {
        router.push("/login")
        return
      }

      setLoading(false)
    }

    fetchAuth()

    return () => {
      cancelled = true
    }
  }, [router, supabase, options?.requireAuth, options?.requiredRole])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }, [router, supabase])

  return { user, profile, loading, signOut }
}
