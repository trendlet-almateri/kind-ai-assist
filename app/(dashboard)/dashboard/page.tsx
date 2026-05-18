/**
 * app/(dashboard)/dashboard/page.tsx — Server Component
 *
 * WHY all data is fetched here (not in child components):
 * - Single data-fetch layer = one Supabase connection per request.
 * - All queries run in Promise.all() — parallel, not waterfall.
 * - Data is passed as props to Client Components that only handle
 *   interactivity (period toggle, chart hover).
 *
 * WHY no loading.tsx skeleton here:
 * - Next.js Suspense streaming handles the skeleton automatically.
 * - The KPI cards animate in via Framer Motion on the client.
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { KpiCards } from '@/features/dashboard/components/KpiCards'
import { ConversationsChart, StatusDonut } from '@/features/dashboard/components/DashboardCharts'
import { EscalationsTable } from '@/features/dashboard/components/EscalationsTable'
import { AgentActivityList } from '@/features/dashboard/components/AgentActivityList'
import { KnowledgeStrip } from '@/features/dashboard/components/KnowledgeStrip'
import {
  fetchDashboardKpis,
  fetchConversationsOverTime,
  fetchStatusBreakdown,
  fetchEscalations,
  fetchAgentActivity,
  fetchKnowledgeCounts,
} from '@/features/dashboard/queries'
import { DashboardSkeleton } from '@/components/shared/Skeletons'

export const metadata: Metadata = { title: 'Dashboard' }

// Revalidate every 30 seconds — dashboard data is not real-time
export const revalidate = 30

export default async function DashboardPage() {
  // All queries run in parallel — no sequential await waterfalls
  const [kpis, convOverTime, statusBreakdown, escalations, agentActivity, knowledgeCounts] =
    await Promise.all([
      fetchDashboardKpis(),
      fetchConversationsOverTime(),
      fetchStatusBreakdown(),
      fetchEscalations(),
      fetchAgentActivity(),
      fetchKnowledgeCounts(),
    ])

  return (
    <div className="space-y-5 p-4 pt-20 lg:p-6 lg:pt-6 w-full overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl leading-none">Dashboard</h1>
        <p className="mt-1.5 text-xs text-muted-foreground/60">
          Support operations overview
        </p>
      </div>

      {/* Knowledge strip */}
      <KnowledgeStrip counts={knowledgeCounts} />

      {/* KPI cards with period toggle (Client Component) */}
      <KpiCards data={kpis} />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ConversationsChart data={convOverTime} />
        </div>
        <div className="min-w-0">
          <StatusDonut data={statusBreakdown} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0"><EscalationsTable data={escalations} /></div>
        <div className="min-w-0"><AgentActivityList data={agentActivity} /></div>
      </div>
    </div>
  )
}
