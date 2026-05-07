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
import { AppSidebar } from '@/components/layout/AppSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Auth guard (redundant with middleware but safe) ──────────────────────
  const session = await getServerSession()
  if (!session) redirect('/login')

  // ── Fetch workspace settings for AI status badge ─────────────────────────
  const supabase = await createSupabaseServerClient()
  const { data: settings } = await supabase
    .from('workspace_settings')
    .select('ai_enabled')
    .single()

  const aiEnabled = settings?.ai_enabled ?? true

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar profile={session.profile} aiEnabled={aiEnabled} />

      {/* Main content — offset by sidebar width via CSS var or padding */}
      <main
        className="flex-1 min-h-screen transition-all duration-200"
        style={{ paddingLeft: '260px' }} // matches sidebar default width
      >
        {children}
      </main>
    </div>
  )
}
