import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  ARENA_ENABLED,
  CHECKLIST_ENABLED,
  GAMIFICATION_ENABLED,
  MONITORING_ENABLED,
  ONLINE_STUDY_ENABLED,
  TIMETABLE_ENABLED,
  isArenaRoute,
  isChecklistRoute,
  isGamificationApiRoute,
  isGamificationRoute,
  isMonitoringApiRoute,
  isMonitoringRoute,
  isOnlineStudyApiRoute,
  isOnlineStudyRoute,
  isRegistrationOpen,
  isTimetableRoute,
} from '@/lib/features'
import { isVerificationBlocked } from '@/lib/email-verify'

/**
 * Middleware for:
 * 1. Refreshing Supabase auth tokens on every request
 * 2. Protecting /teacher/*, /student/*, /arena/*, /live/*, /profile/* routes
 * 3. Role-based access control (student ↔ teacher)
 * 4. Feature locks (online study, gamification, registration)
 * 5. Email verification grace (hard block after 5 days for self_register)
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/teacher',
  '/student',
  '/arena',
  '/live',
  '/profile',
  '/verify-email',
]

// Routes that should only be accessed when NOT authenticated
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

// Email-verify hard-gate does not apply on these (authenticated)
const VERIFY_EXEMPT_PREFIXES = [
  '/verify-email',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Stop paused online-course endpoints before they reach content, access or
  // checkout handlers. Core exam APIs remain available.
  if (!ONLINE_STUDY_ENABLED && isOnlineStudyApiRoute(pathname)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Tính năng học liệu online đang tạm khóa.',
        },
      },
      { status: 503 }
    )
  }

  if (!GAMIFICATION_ENABLED && isGamificationApiRoute(pathname)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Tính năng thành tích và phần thưởng đang tạm khóa.',
        },
      },
      { status: 503 }
    )
  }

  if (!MONITORING_ENABLED && isMonitoringApiRoute(pathname)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: 'Tính năng giám sát đang tạm khóa.',
        },
      },
      { status: 503 }
    )
  }

  // Keep the implementation in the repository, but remove every public entry
  // point while the product focuses on assignments and student management.
  if (!ONLINE_STUDY_ENABLED && isOnlineStudyRoute(pathname)) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/teacher/')) {
      url.pathname = '/teacher/dashboard'
    } else if (pathname.startsWith('/online-student')) {
      url.pathname = '/student/dashboard'
    } else {
      url.pathname = '/'
    }
    url.search = ''
    url.searchParams.set('online-study', 'paused')
    return NextResponse.redirect(url)
  }

  if (pathname === '/student/portal') {
    const url = request.nextUrl.clone()
    url.pathname = '/student/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Public registration is disabled; student accounts are teacher-issued.
  if (!isRegistrationOpen() && pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('notice', 'teacher-issued-account')
    return NextResponse.redirect(url)
  }

  // Gamification locked: bounce to student dashboard
  if (!GAMIFICATION_ENABLED && isGamificationRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/student/dashboard'
    url.searchParams.set('gamification', 'locked')
    return NextResponse.redirect(url)
  }

  // Core-exam focus locks: arena, timetables, checklist, monitoring station.
  // Keep implementations in the repo; remove every public entry point.
  const pausedFeature = !ARENA_ENABLED && isArenaRoute(pathname)
    ? 'arena'
    : !TIMETABLE_ENABLED && isTimetableRoute(pathname)
      ? 'timetable'
      : !CHECKLIST_ENABLED && isChecklistRoute(pathname)
        ? 'checklist'
        : !MONITORING_ENABLED && isMonitoringRoute(pathname)
          ? 'monitoring'
          : null

  if (pausedFeature) {
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/teacher/')) {
      url.pathname = '/teacher/dashboard'
    } else {
      url.pathname = '/student/dashboard'
    }
    url.search = ''
    url.searchParams.set(pausedFeature, 'paused')
    return NextResponse.redirect(url)
  }

  // Create a response that we can modify
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use supabase.auth.getSession() here.
  // Use getUser() which validates the token with the Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  // reset-password is semi-public (user may arrive with recovery session)
  if (!user && pathname.startsWith('/verify-email')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', '/verify-email')
    return NextResponse.redirect(loginUrl)
  }

  // If user is not authenticated and trying to access protected route → redirect to login
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user IS authenticated and visiting login/register → redirect to dashboard
  // Hard gate: self_register past grace → only verify-email (and exempt paths)
  // Role-based access control for authenticated users
  //
  // PERF: the profile row is fetched AT MOST ONCE per request and reused by
  // all three gates below (auth-route redirect, verification hard gate, role check).
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const needsRoleCheck =
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/arena') ||
    pathname.startsWith('/live')

  let profile: {
    role: string
    account_status: string
    email_verified_at: string | null
    account_source: string | null
    created_at: string
  } | null = null

  if (user && (isAuthRoute || isProtected || pathname.startsWith('/student'))) {
    const { data } = await supabase
      .from('profiles')
      .select('role, account_status, email_verified_at, account_source, created_at')
      .eq('id', user.id)
      .single()
    profile = data
  }

  if (user && isAuthRoute) {
    if (!profile) {
      return supabaseResponse
    }

    if (profile.account_status !== 'active') {
      return supabaseResponse
    }

    if (isVerificationBlocked(profile)) {
      const verifyUrl = request.nextUrl.clone()
      verifyUrl.pathname = '/verify-email'
      verifyUrl.searchParams.set('reason', 'deadline')
      return NextResponse.redirect(verifyUrl)
    }

    const dashboardUrl = request.nextUrl.clone()
    if (profile.role === 'teacher') {
      dashboardUrl.pathname = '/teacher/dashboard'
    } else {
      dashboardUrl.pathname = '/student/dashboard'
    }
    return NextResponse.redirect(dashboardUrl)
  }

  if (user) {
    const exempt = VERIFY_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
    if (!exempt && (isProtected || pathname.startsWith('/student'))) {
      if (profile && profile.account_status !== 'active') {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        loginUrl.searchParams.set('error', 'account_disabled')
        return NextResponse.redirect(loginUrl)
      }

      if (profile && isVerificationBlocked(profile)) {
        const verifyUrl = request.nextUrl.clone()
        verifyUrl.pathname = '/verify-email'
        verifyUrl.searchParams.set('reason', 'deadline')
        return NextResponse.redirect(verifyUrl)
      }
    }
  }

  if (user && isProtected && needsRoleCheck) {
    if (profile) {
      if (profile.account_status !== 'active') {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = ''
        loginUrl.searchParams.set('error', 'account_disabled')
        return NextResponse.redirect(loginUrl)
      }

      // Accessing teacher routes
      if (pathname.startsWith('/teacher')) {
        if (profile.role !== 'teacher') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/student/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
      }

      // Accessing student routes
      if (pathname.startsWith('/student')) {
        if (profile.role !== 'student' && profile.role !== 'online_student') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/teacher/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, manifest.json, sw.js (PWA files)
     * - most api routes (paused online-study APIs are matched explicitly)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|sw\\.js|api).*)',
    '/api/online-study/:path*',
    '/api/study/:path*',
    '/api/study-sessions/:path*',
    '/api/subscriptions/:path*',
    '/api/payments/:path*',
    '/api/spaced-repetition/:path*',
    '/api/ai/:path*',
    '/api/discord/:path*',
    '/api/achievements/:path*',
    '/api/challenges/:path*',
    '/api/daily-checkin/:path*',
    '/api/discord/daily-checkin/:path*',
    '/api/rewards/:path*',
    '/api/titles/:path*',
    '/api/monitor/:path*',
  ],
}
