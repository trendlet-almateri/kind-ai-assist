/**
 * features/dashboard/queries.ts — Server-side data fetching
 *
 * WHY server-side (not React Query):
 * - Dashboard KPIs are the first thing the admin sees — they should arrive
 *   with the HTML, not flash in after JS loads.
 * - Server Components stream data from Supabase before sending to the browser.
 * - React Query is still used for CLIENT-side refetch/invalidation after
 *   server-rendered initial data is hydrated.
 *
 * Pattern: Promise.all() for parallel queries — never sequential awaits.
 */

import 'server-only'
import { createSupabaseServerClient } from '@/server/supabase/server'
import type {
  KpiData, DailyConversations, StatusBreakdown,
  AgentActivity, ConvStatus,
} from '@/types'

// ── Time helpers ─────────────────────────────────────────────────────────────
function startOfDayNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── KPI Data ─────────────────────────────────────────────────────────────────
export async function fetchDashboardKpis(): Promise<KpiData> {
  const supabase = await createSupabaseServerClient()

  const now          = new Date().toISOString()
  const today        = startOfDayNDaysAgo(0)
  const yesterday    = startOfDayNDaysAgo(1)
  const weekAgo      = startOfDayNDaysAgo(7)
  const twoWeeksAgo  = startOfDayNDaysAgo(14)
  const monthAgo     = startOfDayNDaysAgo(30)
  const twoMonthsAgo = startOfDayNDaysAgo(60)

  async function countConvs(from: string, to: string): Promise<number> {
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', from)
      .lt('updated_at', to)
    return count ?? 0
  }

  async function aiResRate(from: string, to: string): Promise<number> {
    const { count: total } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', from)
      .lt('created_at', to)

    if (!total) return 0

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .gte('created_at', from)
      .lt('created_at', to)

    const ids = (convs ?? []).map((c) => c.id)
    if (!ids.length) return 0

    const { data: takeovers } = await supabase
      .from('takeover_events')
      .select('conversation_id')
      .eq('event_type', 'human_took_over')
      .in('conversation_id', ids)

    const unique = new Set((takeovers ?? []).map((t) => t.conversation_id))
    return Math.round(((total - unique.size) / total) * 1000) / 10
  }

  async function sumTokens(from: string, to: string): Promise<number> {
    const { data } = await supabase
      .from('messages')
      .select('tokens_used')
      .not('tokens_used', 'is', null)
      .gte('created_at', from)
      .lt('created_at', to)
    return (data ?? []).reduce((s, m) => s + (m.tokens_used as number), 0)
  }

  const [
    convDay, convPrevDay, convWeek, convPrevWeek, convMonth, convPrevMonth,
    aiDay,   aiPrevDay,   aiWeek,   aiPrevWeek,   aiMonth,  aiPrevMonth,
    tokDay,  tokPrevDay,  tokWeek,  tokPrevWeek,  tokMonth, tokPrevMonth,
    escTodayRes, escYestRes,
  ] = await Promise.all([
    countConvs(today, now), countConvs(yesterday, today),
    countConvs(weekAgo, now), countConvs(twoWeeksAgo, weekAgo),
    countConvs(monthAgo, now), countConvs(twoMonthsAgo, monthAgo),

    aiResRate(today, now), aiResRate(yesterday, today),
    aiResRate(weekAgo, now), aiResRate(twoWeeksAgo, weekAgo),
    aiResRate(monthAgo, now), aiResRate(twoMonthsAgo, monthAgo),

    sumTokens(today, now), sumTokens(yesterday, today),
    sumTokens(weekAgo, now), sumTokens(twoWeeksAgo, weekAgo),
    sumTokens(monthAgo, now), sumTokens(twoMonthsAgo, monthAgo),

    supabase.from('conversations').select('*', { count: 'exact', head: true })
      .eq('needs_human_review', true).gte('created_at', today),
    supabase.from('conversations').select('*', { count: 'exact', head: true })
      .eq('needs_human_review', true).gte('created_at', yesterday).lt('created_at', today),
  ])

  return {
    conversations: {
      day: convDay, week: convWeek, month: convMonth,
      prevDay: convPrevDay, prevWeek: convPrevWeek, prevMonth: convPrevMonth,
    },
    aiResolutionRate: {
      day: aiDay, week: aiWeek, month: aiMonth,
      prevDay: aiPrevDay, prevWeek: aiPrevWeek, prevMonth: aiPrevMonth,
    },
    totalTokensUsed: {
      day: tokDay, week: tokWeek, month: tokMonth,
      prevDay: tokPrevDay, prevWeek: tokPrevWeek, prevMonth: tokPrevMonth,
    },
    escalationsToday:     escTodayRes.count ?? 0,
    escalationsYesterday: escYestRes.count ?? 0,
  }
}

// ── Conversations over time (7 days) ─────────────────────────────────────────
export async function fetchConversationsOverTime(): Promise<DailyConversations[]> {
  const supabase = await createSupabaseServerClient()
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days: DailyConversations[] = []

  for (let i = 6; i >= 0; i--) {
    const start = startOfDayNDaysAgo(i)
    const end   = i > 0
      ? startOfDayNDaysAgo(i - 1)
      : new Date(new Date().setHours(23, 59, 59, 999)).toISOString()

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .gte('created_at', start)
      .lt('created_at', end)

    const ids = (convs ?? []).map((c) => c.id)
    let agentCount = 0

    if (ids.length) {
      const { data: takeovers } = await supabase
        .from('takeover_events')
        .select('conversation_id')
        .eq('event_type', 'human_took_over')
        .in('conversation_id', ids)

      agentCount = new Set((takeovers ?? []).map((t) => t.conversation_id)).size
    }

    const d = new Date()
    d.setDate(d.getDate() - i)

    days.push({
      day:          d.toISOString().split('T')[0],
      label:        labels[d.getDay()],
      aiHandled:    ids.length - agentCount,
      agentHandled: agentCount,
    })
  }

  return days
}

// ── Status breakdown ──────────────────────────────────────────────────────────
export async function fetchStatusBreakdown(): Promise<StatusBreakdown[]> {
  const supabase = await createSupabaseServerClient()
  const colors: Record<ConvStatus, string> = {
    open: '#3B82F6', assigned: '#F59E0B', resolved: '#10B981', closed: '#4B5563',
  }

  const statuses: ConvStatus[] = ['open', 'assigned', 'resolved', 'closed']
  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return { status, count: count ?? 0, color: colors[status] }
    })
  )

  return results
}

// ── Escalations table ─────────────────────────────────────────────────────────
export async function fetchEscalations() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('conversations')
    .select('id, customer_name, escalation_reason, channel, created_at')
    .eq('needs_human_review', true)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

// ── Agent activity ─────────────────────────────────────────────────────────────
export async function fetchAgentActivity(): Promise<AgentActivity[]> {
  const supabase = await createSupabaseServerClient()

  const [{ data: agents }, { data: assignments }] = await Promise.all([
    supabase.from('agent_profiles').select('*').order('is_online', { ascending: false }),
    supabase.from('conversations').select('assigned_agent')
      .not('assigned_agent', 'is', null).in('status', ['open', 'assigned']),
  ])

  const countMap: Record<string, number> = {}
  for (const a of assignments ?? []) {
    countMap[a.assigned_agent!] = (countMap[a.assigned_agent!] ?? 0) + 1
  }

  return (agents ?? []).map((agent) => ({
    ...agent,
    assigned_count: countMap[agent.id] ?? 0,
  })) as AgentActivity[]
}

// ── Knowledge counts ────────────────────────────────────────────────────────
export async function fetchKnowledgeCounts() {
  const supabase = await createSupabaseServerClient()

  const [total, ready, processing, failed] = await Promise.all([
    supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }),
    supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }).in('status', ['uploading', 'processing']),
    supabase.from('knowledge_sources').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
  ])

  return {
    total: total.count ?? 0,
    ready: ready.count ?? 0,
    processing: processing.count ?? 0,
    failed: failed.count ?? 0,
  }
}
