/**
 * app/auth/callback/page.tsx
 * Auth callback — MUST be a client page (not a Route Handler).
 *
 * WHY: Supabase invite emails embed tokens in the URL hash (#access_token=…).
 * Hash fragments are browser-only and never sent to the server, so a Route Handler
 * would always receive an empty request and fail. A client component can read
 * window.location.hash directly and exchange the tokens for a real session.
 */

import { Suspense } from 'react'
import { AuthCallbackPage } from '@/features/auth/components/AuthCallbackPage'

export default function CallbackPage() {
  return (
    <Suspense>
      <AuthCallbackPage />
    </Suspense>
  )
}
