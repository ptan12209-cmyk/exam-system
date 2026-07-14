import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  GAMIFICATION_ENABLED,
  isGamificationRoute,
  isRegistrationOpen,
} from '@/lib/features'
import { isVerificationBlocked } from '@/lib/email-verify'

/**
 * Middleware for:
 * 1. Refreshing Supabase auth tokens on every request
 * 2. Protecting /teacher/*, /student/*, /arena/*, /live/*, /profile/* routes
 * 3. Role-based access control (student ↔ teacher)
 * 4. Feature locks (gamification, registration)
 * 5. Email verification grace (hard block after 5 days for self_register)
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/teacher',
  '/student',
  '/arena',
  '/live',
  '/profile',
  '/pricing',
  '/online-student',
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
  '/payment/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public registration temporarily locked (overview-only period)
  if (!isRegistrationOpen() && pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('dang-ky', 'tam-khoa')
    return NextResponse.redirect(url)
  }

  // Gamification locked: bounce to student dashboard
  if (!GAMIFICATION_ENABLED && isGamificationRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/student/dashboard'
    url.searchParams.set('gamification', 'locked')
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
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

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
  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email_verified_at, account_source, created_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
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
      dashboardUrl.pathname = '/teacher/online-study'
    } else {
      dashboardUrl.pathname = '/online-student/dashboard'
    }
    return NextResponse.redirect(dashboardUrl)
  }

  // Hard gate: self_register past grace → only verify-email (and exempt paths)
  if (user) {
    const exempt = VERIFY_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
    if (!exempt && (isProtected || pathname.startsWith('/student'))) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email_verified_at, account_source, created_at')
        .eq('id', user.id)
        .single()

      if (profile && isVerificationBlocked(profile)) {
        const verifyUrl = request.nextUrl.clone()
        verifyUrl.pathname = '/verify-email'
        verifyUrl.searchParams.set('reason', 'deadline')
        return NextResponse.redirect(verifyUrl)
      }
    }
  }

  // Role-based access control for authenticated users
  if (user && isProtected) {
    const needsRoleCheck =
      pathname.startsWith('/teacher') ||
      pathname.startsWith('/student') ||
      pathname.startsWith('/online-student') ||
      pathname.startsWith('/arena') ||
      pathname.startsWith('/live')

    if (needsRoleCheck) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Accessing teacher routes
        if (pathname.startsWith('/teacher')) {
          if (profile.role !== 'teacher') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/online-student/dashboard'
            return NextResponse.redirect(redirectUrl)
          }
          const isAllowedTeacherPath =
            pathname.startsWith('/teacher/online-study') ||
            pathname.startsWith('/teacher/profile') ||
            pathname.startsWith('/teacher/feedback')

          if (!isAllowedTeacherPath) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/teacher/online-study'
            return NextResponse.redirect(redirectUrl)
          }
        }

        // Accessing student routes
        if (pathname.startsWith('/student')) {
          if (profile.role !== 'student' && profile.role !== 'online_student') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/teacher/online-study'
            return NextResponse.redirect(redirectUrl)
          }
          const isProfilePage = pathname.startsWith('/student/profile')
          if (!isProfilePage) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/online-student/dashboard'
            return NextResponse.redirect(redirectUrl)
          }
        }

        // Accessing online student routes - allow both student and online_student roles
        if (pathname.startsWith('/online-student')) {
          if (profile.role !== 'online_student' && profile.role !== 'student') {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            return NextResponse.redirect(redirectUrl)
          }
        }

        // Accessing deprecated public/shared protected routes (like arena or live)
        if (pathname.startsWith('/arena') || pathname.startsWith('/live')) {
          const redirectUrl = request.nextUrl.clone()
          if (profile.role === 'teacher') {
            redirectUrl.pathname = '/teacher/online-study'
          } else {
            redirectUrl.pathname = '/online-student/dashboard'
          }
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
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|sw\\.js|api).*)',
  ],
}
