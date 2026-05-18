/**
 * app/(auth)/accept-invite/page.tsx
 * Handles the Supabase invite link — lets the invited person set their password.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AcceptInviteForm } from '@/features/auth/components/AcceptInviteForm'

export const metadata: Metadata = {
  title: 'Accept Invite',
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  )
}
