'use client'

/**
 * features/auth/components/AuthCallbackPage.tsx
 *
 * Handles all Supabase auth redirect flows on the client side:
 *
 *  Implicit flow (current Supabase default):
 *    /auth/callback#access_token=…&refresh_token=…&type=invite
 *    → reads hash, calls supabase.auth.setSession()
 *
 *  OTP / PKCE flow (future):
 *    /auth/callback?token_hash=…&type=invite
 *    → reads query params, calls supabase.auth.verifyOtp()
 *
 * After establishing the session:
 *  - invite → /accept-invite (user sets their password)
 *  - anything else → /inbox (or ?next= override)
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/server/supabase/client'

export function AuthCallbackPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // ── Read from hash (implicit flow) ──────────────────────────────────────
    const hash        = window.location.hash.slice(1)
    const hashParams  = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken= hashParams.get('refresh_token')
    const hashType    = hashParams.get('type')

    // ── Read from query params (PKCE / OTP flow) ────────────────────────────
    const tokenHash   = searchParams.get('token_hash')
    const queryType   = searchParams.get('type')
    const next        = searchParams.get('next') ?? '/inbox'

    if (accessToken && refreshToken) {
      // ── Implicit flow ──────────────────────────────────────────────────────
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) {
            setError(err.message)
            return
          }
          // Clean tokens from URL before navigating away
          window.history.replaceState({}, '', '/auth/callback')
          router.replace(hashType === 'invite' ? '/accept-invite' : next)
        })

    } else if (tokenHash && queryType) {
      // ── OTP / PKCE flow ────────────────────────────────────────────────────
      supabase.auth
        .verifyOtp({
          token_hash: tokenHash,
          type: queryType as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
        })
        .then(({ error: err }) => {
          if (err) {
            setError(err.message)
            return
          }
          router.replace(queryType === 'invite' ? '/accept-invite' : next)
        })

    } else {
      // No tokens at all — go to login
      router.replace('/login')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.includes('expired')
              ? 'This invite link has expired. Ask your admin to send a new one.'
              : error
            }
          </div>
          <a
            href="/login"
            className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
    </div>
  )
}
