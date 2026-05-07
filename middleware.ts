/**
 * middleware.ts
 * Next.js Edge Middleware — runs before EVERY matched request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie (keeps users logged in)
 * 2. Protect authenticated routes — redirect to /login if no session
 * 3. Protect admin-only routes — redirect to /inbox if not admin
 * 4. Redirect authenticated users away from /login
 *
 * WHY middleware (not per-page server component guards):
 * - Middleware runs at the Edge — zero cold starts, runs before the
 *   page is even loaded, so there's no flash of unprotected content.
 * - Centralised auth logic in ONE place instead of repeated in every page.
 * - Session refresh here prevents "stuck logged-out" bugs.
 *
 * WHY we DON'T fetch the full profile in middleware:
 * - Middleware runs on every request — a DB round-trip for role checking
 *   would add ~50-100ms to every page load.
 * - Instead, we store the role in a custom JWT claim or read it from a
 *   lightweight cookie set at login. For simplicity here we do a single
 *   agent_profiles read only on admin-route attempts.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES  = ['/dashboard', '/inbox', '/knowledge', '/agents', '/settings']
// Routes restricted to admins only
const ADMIN_ONLY_ROUTES = ['/dashboard', '/agents', '/settings']
// Routes that authenticated users should not see
const AUTH_ROUTES       = ['/login']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ── Step 1: Create a Supabase client that can refresh cookies ──────────
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

  // ── Step 2: Refresh session (IMPORTANT — do not remove) ────────────────
  // getUser() validates the JWT and refreshes it if expired.
  // Do NOT use getSession() here — it doesn't validate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Step 3: Redirect authenticated users away from /login ──────────────
  if (user && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Step 4: Protect all authenticated routes ───────────────────────────
  if (!user && PROTECTED_ROUTES.some((r) => pathname.startsWith(r))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // ── Step 5: Protect admin-only routes ─────────────────────────────────
  if (user && ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
    const { data: profile } = await supabase
      .from('agent_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin' || profile.status !== 'active') {
      const url = request.nextUrl.clone()
      url.pathname = '/inbox'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico   (browser favicon)
     * - api/webhooks  (WhatsApp webhook must be public — Meta verifies it)
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
