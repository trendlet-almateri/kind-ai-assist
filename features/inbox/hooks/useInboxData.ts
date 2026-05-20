'use client'

/**
 * features/inbox/hooks/useInboxData.ts
 *
 * WHY React Query for inbox (not Server Components):
 * - Inbox needs real-time updates — Supabase Realtime pushes new messages
 *   and conversation changes without page reloads.
 * - Optimistic UI for sending messages feels instant.
 * - Server Components can't subscribe to Realtime channels.
 *
 * Architecture:
 * - useConversations: paginated list + Realtime subscription
 * - useMessages: per-conversation messages + Realtime subscription
 * - useSendMessage: optimistic insert via WhatsApp API
 * - useToggleAI: immediate UI toggle with server sync
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback, useId, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/server/supabase/client'
import { buildReopenPayload } from '@/lib/conversation'
import type {
  Conversation, Message, TakeoverEvent, AgentProfile, ConvFilter,
} from '@/types'

const KEYS = {
  conversations: (filter: ConvFilter, userId?: string) =>
    ['inbox', 'conversations', filter, userId] as const,
  lastMessages:  (ids: string[])  => ['inbox', 'last-messages', ids]   as const,
  messages:      (convId: string) => ['inbox', 'messages', convId]     as const,
  takeovers:     (convId: string) => ['inbox', 'takeovers', convId]    as const,
  agents:        ()               => ['inbox', 'agents']               as const,
}

// ── Conversations list ────────────────────────────────────────────────────────
export function useConversations(filter: ConvFilter, userId?: string) {
  const id          = useId()
  const qc          = useQueryClient()
  // Deduplication: prevent the same conversation from firing the escalation toast
  // more than once within 10 seconds. Needed because doEscalation() inserts 2 messages
  // which trigger DB-level updated_at bumps on conversations — each fires a Realtime UPDATE.
  const toastedIds  = useRef<Set<string>>(new Set())

  const query = useQuery({
    queryKey: KEYS.conversations(filter, userId),
    queryFn: async () => {
      let q = supabase
        .from('conversations')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (filter === 'resolved') {
        q = q.eq('status', 'resolved')
      } else if (filter === 'needs_review') {
        // Queue = conversations actively waiting for a human:
        //   needs_human_review = true  (AI escalated or keyword triggered)
        //   OR is_ai_active = false AND assigned_agent IS NULL (human took over, unassigned)
        // Exclude already-assigned and resolved conversations — they show in 'all'/'assigned_to_me'
        q = q
          .or('needs_human_review.eq.true,and(is_ai_active.eq.false,assigned_agent.is.null)')
          .neq('status', 'resolved')
      } else {
        // all / open / assigned_to_me — exclude resolved
        q = q.neq('status', 'resolved')
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Conversation[]
    },
    staleTime: 10_000,
  })

  // Realtime: invalidate on any conversation change + fire toast on new escalations
  useEffect(() => {
    const channel = supabase
      .channel(`conversations-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newRow = payload.new as Conversation
          const oldRow = payload.old as Partial<Conversation>
          // Fire toast when conversation newly enters the escalation queue.
          // Guard with toastedIds to prevent duplicate toasts — doEscalation() inserts
          // 2 messages which each trigger a DB updated_at bump on conversations,
          // causing 3 Realtime UPDATE events for a single escalation action.
          if (newRow.needs_human_review && !oldRow.needs_human_review) {
            if (!toastedIds.current.has(newRow.id)) {
              toastedIds.current.add(newRow.id)
              toast.warning(
                `New escalation: ${newRow.customer_name ?? newRow.customer_phone ?? 'Unknown'}`,
                {
                  description: newRow.escalation_reason ?? undefined,
                  duration: 8000,
                }
              )
              // Clear after 10s so a genuine re-escalation in a new session can still toast
              setTimeout(() => toastedIds.current.delete(newRow.id), 10_000)
            }
          }
          qc.invalidateQueries({ queryKey: ['inbox', 'conversations'] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => { qc.invalidateQueries({ queryKey: ['inbox', 'conversations'] }) }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversations' },
        () => { qc.invalidateQueries({ queryKey: ['inbox', 'conversations'] }) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, qc])

  return query
}

// ── Last message preview per conversation ─────────────────────────────────────
export function useLastMessages(conversationIds: string[]) {
  const id = useId()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEYS.lastMessages(conversationIds),
    queryFn: async () => {
      if (!conversationIds.length) return {}

      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id, content, role, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      const map: Record<string, { content: string; role: string }> = {}
      for (const msg of data ?? []) {
        if (!map[msg.conversation_id]) {
          map[msg.conversation_id] = { content: msg.content, role: msg.role }
        }
      }
      return map
    },
    enabled: conversationIds.length > 0,
    staleTime: 10_000,
  })

  // dep array omits conversationIds — channel subscribes globally to all message inserts,
  // recreating it on every conversation list change would cause brief subscription gaps
  useEffect(() => {
    const channel = supabase
      .channel(`last-messages-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['inbox', 'last-messages'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, qc])

  return query
}

// ── Messages for a conversation ───────────────────────────────────────────────
export function useMessages(conversationId: string | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEYS.messages(conversationId ?? ''),
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Message[]
    },
    enabled: !!conversationId,
    staleTime: 5_000,
  })

  // Per-conversation Realtime subscription
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => { qc.invalidateQueries({ queryKey: KEYS.messages(conversationId) }) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, qc])

  return query
}

// ── Send message ──────────────────────────────────────────────────────────────
export function useSendMessage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      customerPhone,
    }: {
      conversationId: string
      content: string
      customerPhone?: string | null
    }) => {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: content }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Send failed')
      }
    },
    onSuccess: (_data, { conversationId }) => {
      qc.invalidateQueries({ queryKey: KEYS.messages(conversationId) })
      qc.invalidateQueries({ queryKey: ['inbox', 'conversations'] })
    },
  })
}

// ── Takeover events ───────────────────────────────────────────────────────────
export function useTakeoverEvents(conversationId: string | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEYS.takeovers(conversationId ?? ''),
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('takeover_events')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as TakeoverEvent[]
    },
    enabled: !!conversationId,
  })

  // Real-time: refresh activity log on new events
  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`takeovers-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'takeover_events',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: KEYS.takeovers(conversationId) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, qc])

  return query
}

// ── Toggle AI ─────────────────────────────────────────────────────────────────
export function useToggleAI(agentId?: string) {
  const qc = useQueryClient()

  return useCallback(
    async (conversationId: string, currentlyActive: boolean, workspaceId: string) => {
      if (!agentId) return
      const newActive = !currentlyActive

      const updates: Record<string, unknown> = {
        is_ai_active: newActive,
        updated_at:   new Date().toISOString(),
        ...(newActive
          ? { assigned_agent: null, status: 'open', agent_last_reply_at: null }
          : { assigned_agent: agentId, status: 'assigned', agent_last_reply_at: new Date().toISOString(), had_human_intervention: true }
        ),
      }

      await supabase.from('conversations').update(updates).eq('id', conversationId)
      await supabase.from('takeover_events').insert({
        workspace_id:    workspaceId,
        conversation_id: conversationId,
        agent_id:        agentId,
        event_type:      newActive ? 'ai_resumed' : 'human_took_over',
      })

      qc.invalidateQueries({ queryKey: ['inbox'] })
    },
    [agentId, qc]
  )
}

// ── Update conversation ───────────────────────────────────────────────────────
export function useUpdateConversation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      updates,
    }: {
      conversationId: string
      updates: Partial<Conversation>
    }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

// ── Resolve conversation ──────────────────────────────────────────────────────
export function useResolveConversation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversationId,
      agentId,
      workspaceId,
      reopen = false,
    }: {
      conversationId: string
      agentId: string
      workspaceId: string
      reopen?: boolean
    }) => {
      const now = new Date().toISOString()

      // buildReopenPayload() resets ALL escalation state + session_started_at = now()
      // so the AI receives a clean session. Identical fields to the Twilio reopen path.
      const conversationUpdates = reopen
        ? buildReopenPayload()
        : { status: 'resolved' as const, resolved_at: now, needs_human_review: false,
            escalation_reason: null, updated_at: now }

      const { error: convErr } = await supabase
        .from('conversations')
        .update(conversationUpdates)
        .eq('id', conversationId)
      if (convErr) throw convErr

      const { error: evtErr } = await supabase
        .from('takeover_events')
        .insert({
          workspace_id:    workspaceId,
          conversation_id: conversationId,
          agent_id:        agentId,
          event_type: reopen ? 'conversation_reopened' : 'conversation_resolved',
        })
      if (evtErr) throw evtErr
    },
    onSuccess: (_data, { conversationId, reopen }) => {
      if (!reopen) {
        // Fire-and-forget — generate summaries after resolve.
        // Failure is non-fatal: conversation is already resolved, next session works without summary.
        fetch(`/api/conversations/${conversationId}/summarize`, { method: 'POST' })
          .catch(() => {})
      }
      qc.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

// ── Agents list (for reassignment) ────────────────────────────────────────────
export function useAgentsList() {
  const id = useId()
  const qc = useQueryClient()

  // Realtime: update agent list when online status or profile changes
  useEffect(() => {
    const channel = supabase
      .channel(`agents-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_profiles' }, () => {
        qc.invalidateQueries({ queryKey: KEYS.agents() })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, qc])

  return useQuery({
    queryKey: KEYS.agents(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('status', 'active')
        .order('is_online', { ascending: false })
      if (error) throw error
      return (data ?? []) as AgentProfile[]
    },
    staleTime: 30_000,
  })
}

// ── Atomic "Assign to Me" ─────────────────────────────────────────────────────
// Uses a conditional UPDATE (assigned_agent IS NULL) to prevent race conditions
// when multiple agents try to claim the same conversation simultaneously.
export function useAssignToMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ conversationId, agentId }: { conversationId: string; agentId: string }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          assigned_agent: agentId,
          status:         'assigned',
          updated_at:     new Date().toISOString(),
        })
        .eq('id', conversationId)
        .is('assigned_agent', null)   // Only claim if still unassigned (atomic guard)
        .select('id')
        .single()

      if (error || !data) {
        throw new Error('This conversation was just assigned to another agent')
      }
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inbox'] }) },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Human queue count (for sidebar badge) ────────────────────────────────────
// Counts conversations with needs_human_review=true that are waiting for a human.
// Realtime: re-fetches on any conversation change so the badge updates instantly.
export function useQueueCount() {
  const id = useId()
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`queue-count-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        qc.invalidateQueries({ queryKey: ['inbox', 'queue-count'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, qc])

  return useQuery({
    queryKey: ['inbox', 'queue-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('needs_human_review', true)
        .is('deleted_at', null)
      if (error) throw error
      return count ?? 0
    },
    staleTime: 5_000,
  })
}
