/**
 * app/(dashboard)/agents/page.tsx — Server Component
 * Fetches agents + conv counts server-side, passes to client shell.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession, createSupabaseServerClient } from '@/server/supabase/server'
import { AgentsShell } from '@/features/agents/components/AgentsShell'

export const metadata: Metadata = { title: 'Agents' }
export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') redirect('/inbox')

  const supabase = await createSupabaseServerClient()

  const [{ data: agents }, { data: convCounts }] = await Promise.all([
    supabase.from('agent_profiles').select('*').order('full_name'),
    supabase.from('conversations').select('assigned_agent')
      .not('assigned_agent', 'is', null)
      .in('status', ['open', 'assigned']),
  ])

  const countMap: Record<string, number> = {}
  for (const c of convCounts ?? []) {
    countMap[c.assigned_agent!] = (countMap[c.assigned_agent!] ?? 0) + 1
  }

  const agentsWithCounts = (agents ?? []).map((a) => ({
    ...a,
    assigned_conversations: countMap[a.id] ?? 0,
  }))

  return <AgentsShell agents={agentsWithCounts} currentUserId={session.profile.id} />
}
