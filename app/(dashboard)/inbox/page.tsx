/**
 * app/(dashboard)/inbox/page.tsx — Server Component entry
 *
 * WHY Server Component wrapping a Client Shell:
 * - Auth + workspace settings are fetched server-side (no client round-trip).
 * - The InboxShell (Client Component) gets profile + aiEnabled as props.
 * - Inbox itself uses React Query + Supabase Realtime — must be client.
 *
 * The page has NO padding (unlike other pages) — the 3-panel layout
 * fills the full viewport height.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession, createSupabaseServerClient } from '@/server/supabase/server'
import { InboxShell } from '@/features/inbox/components/InboxShell'

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic' // always fresh — real-time page

export default async function InboxPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('ai_enabled')
    .single()

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading…</div>}>
      <InboxShell
        profile={session.profile}
        aiEnabled={settings?.ai_enabled ?? true}
      />
    </Suspense>
  )
}
