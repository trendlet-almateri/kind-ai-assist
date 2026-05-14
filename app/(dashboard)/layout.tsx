/**
 * app/(dashboard)/layout.tsx — Dashboard Group Layout (Server Component)
 *
 * WHY Server Component:
 * - Fetches profile + workspace settings server-side — zero waterfall.
 * - Passes data as props to the client sidebar — no extra round-trips.
 * - getServerSession() already validates auth (double-check after middleware).
 *
 * Structure:
 * Server Layout fetches → passes to Client Sidebar
 * Children render in the main content area.
 */

import { redirect } from 'next/navigation'
import { getServerSession } from '@/server/supabase/server'
import { createSupabaseServerClient } from '@/server/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Run auth + workspace settings in parallel ────────────────────────────
  // getServerSession and createSupabaseServerClient are both React cache()-d
  // so concurrent calls within the same request reuse the same instance.
  const supabase = await createSupabaseServerClient()

  const [session, { data: settings }] = await Promise.all([
    getServerSession(),
    supabase.from('workspace_settings').select('ai_enabled').single(),
  ])

  if (!session) redirect('/login')

  const aiEnabled = settings?.ai_enabled ?? true

  return (
    <DashboardShell profile={session.profile} aiEnabled={aiEnabled}>
      {children}
    </DashboardShell>
  )
}
