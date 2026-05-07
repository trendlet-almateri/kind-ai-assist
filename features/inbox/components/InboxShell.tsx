'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConversationList } from './ConversationList'
import { ChatWindow } from './ChatWindow'
import { ConversationDetails } from './ConversationDetails'
import {
  useConversations, useLastMessages, useMessages,
  useSendMessage, useTakeoverEvents, useToggleAI,
  useUpdateConversation, useAgentsList,
} from '@/features/inbox/hooks/useInboxData'
import type { ConvFilter } from '@/types'
import type { AgentProfile } from '@/types/database'

interface InboxShellProps {
  profile:   AgentProfile
  aiEnabled: boolean
}

export function InboxShell({ profile, aiEnabled }: InboxShellProps) {
  const searchParams  = useSearchParams()
  const initialId     = searchParams.get('id')
  const initialFilter = (searchParams.get('filter') as ConvFilter) ?? 'all'

  const [selectedId, setSelectedId]   = useState<string | null>(initialId)
  const [filter, setFilter]           = useState<ConvFilter>(initialFilter)
  const [search, setSearch]           = useState('')
  const [isSending, setIsSending]     = useState(false)

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convLoading } =
    useConversations(filter, profile.id)

  const conversationIds = useMemo(
    () => conversations.map((c) => c.id),
    [conversations]
  )

  const { data: lastMessages = {} }   = useLastMessages(conversationIds)
  const { data: messages = [],
          isLoading: msgLoading }      = useMessages(selectedId)
  const { data: takeoverEvents = [] } = useTakeoverEvents(selectedId)
  const { data: agents = [] }         = useAgentsList()

  const sendMessageMut    = useSendMessage()
  const toggleAI          = useToggleAI(profile.id)
  const updateConversation = useUpdateConversation()

  // ── Filter + search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter((c) =>
      c.customer_name?.toLowerCase().includes(q) ||
      c.customer_phone?.includes(q) ||
      c.customer_email?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  // ── Selected conversation ─────────────────────────────────────────────────
  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (content: string) => {
    if (!selectedConv) return
    setIsSending(true)
    try {
      await sendMessageMut.mutateAsync({
        conversationId: selectedConv.id,
        content,
        customerPhone: selectedConv.customer_phone,
      })
    } finally {
      setIsSending(false)
    }
  }, [selectedConv, sendMessageMut])

  const handleUpdateConversation = useCallback(
    (id: string, updates: Parameters<typeof updateConversation.mutate>[0]['updates']) => {
      updateConversation.mutate({ conversationId: id, updates })
    },
    [updateConversation]
  )

  return (
    <div className="flex h-screen font-agent">
      {/* Panel 1 — Conversation list */}
      <ConversationList
        conversations={filtered}
        lastMessages={lastMessages}
        isLoading={convLoading}
        selectedId={selectedId}
        filter={filter}
        onSelect={setSelectedId}
        onFilterChange={setFilter}
        search={search}
        onSearch={setSearch}
      />

      {/* Panel 2 — Chat window */}
      <ChatWindow
        messages={messages}
        isLoading={msgLoading}
        isAiActive={selectedConv?.is_ai_active ?? true}
        isSending={isSending}
        onSend={handleSend}
        conversationId={selectedId}
      />

      {/* Panel 3 — Conversation details */}
      <ConversationDetails
        conversation={selectedConv}
        takeoverEvents={takeoverEvents}
        agents={agents}
        agentId={profile.id}
        aiEnabled={aiEnabled}
        isAdmin={profile.role === 'admin'}
        onToggleAI={toggleAI}
        onUpdateConversation={handleUpdateConversation}
      />
    </div>
  )
}
