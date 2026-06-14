import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware for:
 * 1. Refreshing Supabase auth tokens on every request
 * 2. Protecting /teacher/*, /student/*, /arena/*, /live/*, /profile/* routes
 * 3. Role-based access control (student ↔ teacher)
 */

// Routes that require authentication
const PROTECTED_PREFIXES = ['/teacher', '/student', '/arena', '/live', '/profile', '/pricing']

// Routes that should only be accessed when NOT authenticated
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
          cookiesToSet.forEach(({ name, value, options }) =>
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
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route → redirect to login
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user IS authenticated and visiting login/register → redirect to dashboard
  if (user && isAuthRoute) {
    // Fetch role to decide where to redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = profile?.role === 'teacher'
      ? '/teacher/dashboard'
      : '/student/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Role-based access control for authenticated users
  if (user && isProtected) {
    const needsRoleCheck = pathname.startsWith('/teacher') || pathname.startsWith('/student')
    
    if (needsRoleCheck) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        // Student trying to access teacher routes
        if (pathname.startsWith('/teacher') && profile.role !== 'teacher') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/student/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
        // Teacher trying to access student routes
        if (pathname.startsWith('/student') && profile.role !== 'student') {
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
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|sw\\.js|api).*)',
  ],
}
