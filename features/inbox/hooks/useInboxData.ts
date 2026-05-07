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
import { useEffect, useCallback } from 'react'
import { supabase } from '@/server/supabase/client'
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
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: KEYS.conversations(filter, userId),
    queryFn: async () => {
      let q = supabase
        .from('conversations')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })

      if (filter === 'open')           q = q.eq('status', 'open')
      if (filter === 'assigned_to_me') q = q.eq('assigned_agent', userId ?? '')
      if (filter === 'needs_review')   q = q.eq('needs_human_review', true)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Conversation[]
    },
    staleTime: 10_000,
  })

  // Realtime: invalidate on any conversation change
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        qc.invalidateQueries({ queryKey: ['inbox', 'conversations'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

// ── Last message preview per conversation ─────────────────────────────────────
export function useLastMessages(conversationIds: string[]) {
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

  useEffect(() => {
    if (!conversationIds.length) return
    const channel = supabase
      .channel('last-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        qc.invalidateQueries({ queryKey: ['inbox', 'last-messages'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationIds, qc])

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
  return useQuery({
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
}

// ── Toggle AI ─────────────────────────────────────────────────────────────────
export function useToggleAI(agentId?: string) {
  const qc = useQueryClient()

  return useCallback(
    async (conversationId: string, currentlyActive: boolean) => {
      if (!agentId) return
      const newActive = !currentlyActive

      const updates: Record<string, unknown> = {
        is_ai_active: newActive,
        updated_at:   new Date().toISOString(),
        ...(newActive
          ? { assigned_agent: null, status: 'open', agent_last_reply_at: null }
          : { assigned_agent: agentId, status: 'assigned', agent_last_reply_at: new Date().toISOString() }
        ),
      }

      await supabase.from('conversations').update(updates).eq('id', conversationId)
      await supabase.from('takeover_events').insert({
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

// ── Agents list (for reassignment) ────────────────────────────────────────────
export function useAgentsList() {
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
