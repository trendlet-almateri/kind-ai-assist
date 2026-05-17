'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Info, X } from 'lucide-react'
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
  const [detailsOpen, setDetailsOpen] = useState(false)

  // ── Escape key — deselect conversation ───────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (detailsOpen) { setDetailsOpen(false); return }
      if (selectedId)  { setSelectedId(null) }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedId, detailsOpen])

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

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  // On mobile: show list when nothing selected, show chat when selected
  const showList = !selectedId
  const showChat = !!selectedId

  return (
    <div className="flex h-full font-agent pt-14 lg:pt-0">
      {/* Panel 1 — Conversation list (full width on mobile when no convo selected) */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex w-full lg:w-auto flex-col`}>
        <ConversationList
          conversations={filtered}
          lastMessages={lastMessages}
          isLoading={convLoading}
          selectedId={selectedId}
          filter={filter}
          onSelect={handleSelect}
          onFilterChange={setFilter}
          search={search}
          onSearch={setSearch}
        />
      </div>

      {/* Panel 2 + 3 — Chat + details (full width on mobile when convo selected) */}
      <div className={`${showChat ? 'flex' : 'hidden'} lg:flex flex-1 flex-col lg:flex-row min-w-0 h-full`}>
        {/* Mobile top bar — back + info */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card shrink-0">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            ← Back
          </button>
          {selectedConv && (
            <button
              onClick={() => setDetailsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent active:bg-accent/80 transition-colors"
              aria-label="Conversation details"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
        </div>

        <ChatWindow
          messages={messages}
          isLoading={msgLoading}
          isAiActive={selectedConv?.is_ai_active ?? true}
          isSending={isSending}
          onSend={handleSend}
          conversationId={selectedId}
        />

        {/* Details panel hidden on mobile to save space */}
        <div className="hidden lg:flex h-full">
          <ConversationDetails
            conversation={selectedConv}
            takeoverEvents={takeoverEvents}
            agents={agents}
            aiEnabled={aiEnabled}
            isAdmin={profile.role === 'admin'}
            onToggleAI={toggleAI}
            onUpdateConversation={handleUpdateConversation}
          />
        </div>
      </div>

      {/* ── Mobile bottom sheet — ConversationDetails ──────────────────── */}
      {detailsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setDetailsOpen(false)}
          />

          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden flex flex-col rounded-t-2xl bg-sidebar shadow-2xl overflow-hidden"
            style={{ maxHeight: '85dvh' }}
          >
            {/* Drag handle + header */}
            <div className="shrink-0 px-4 pt-3 pb-2">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border/60" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Details</p>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <ConversationDetails
                conversation={selectedConv}
                takeoverEvents={takeoverEvents}
                agents={agents}
                aiEnabled={aiEnabled}
                isAdmin={profile.role === 'admin'}
                onToggleAI={toggleAI}
                onUpdateConversation={handleUpdateConversation}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
