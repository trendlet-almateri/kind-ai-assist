/**
 * app/auth/callback/route.ts
 *
 * Centralised server-side auth callback — handles ALL Supabase redirect flows:
 *   • Invite  links  → ?token_hash=…&type=invite
 *   • Magic  links  → ?token_hash=…&type=magiclink
 *   • OAuth  flows  → ?code=…
 *
 * WHY a Route Handler (not a page):
 *   Hash fragments (#access_token=…) are browser-only and never reach the server.
 *   Query parameters (?token_hash=… or ?code=…) ARE sent to the server, so we can
 *   exchange them for a real session here, write the session cookies, and redirect —
 *   all before the browser ever renders a page.  This gives proper SSR auth,
 *   stable middleware, and clean cookie handling.
 */

import { NextResponse }              from 'next/server'
import { createSupabaseServerClient } from '@/server/supabase/server'
import { cookies }                   from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')   // 'invite' | 'magiclink' | 'recovery' …
  const next       = searchParams.get('next') ?? '/inbox'

  const supabase = await createSupabaseServerClient()

  // ── OAuth / PKCE code flow ─────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
  }

  // ── Invite / magic-link / recovery token flow ──────────────────────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
    })

    if (!error) {
      // Invite → user still needs to set a password; send them to the form
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/accept-invite`)
      }
      // All other types → go to the intended next destination
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] verifyOtp error:', error.message)
  }

  // ── Fallback: something went wrong ─────────────────────────────────────────
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Invalid or expired link — please try again.')}`
  )
}
