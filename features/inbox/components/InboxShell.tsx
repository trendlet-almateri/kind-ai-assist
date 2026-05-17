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
  useUpdateConversation, useAgentsList, useResolveConversation,
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

  const sendMessageMut     = useSendMessage()
  const toggleAI           = useToggleAI(profile.id)
  const updateConversation = useUpdateConversation()
  const resolveConversation = useResolveConversation()

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

  const handleResolve = useCallback(
    (id: string, reopen = false) => {
      const workspaceId = conversations.find((c) => c.id === id)?.workspace_id ?? ''
      resolveConversation.mutate(
        { conversationId: id, agentId: profile.id, workspaceId, reopen },
        { onSuccess: () => { if (!reopen) setSelectedId(null) } }
      )
    },
    [resolveConversation, profile.id, conversations]
  )

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  // On mobile: show list when nothing selected, show chat when selected
  const showList = !selectedId
  const showChat = !!selectedId

  return (
    <div className="flex h-full font-agent">
      {/* Panel 1 — Conversation list */}
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

      {/* ── Mobile full-screen chat overlay ──────────────────────────────── */}
      {showChat && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background lg:hidden">
          {/* Mobile top bar — back · name · resolve · info */}
          <div className="shrink-0 flex items-center gap-2 h-14 px-3 border-b border-border/50 bg-sidebar/95 backdrop-blur-md">
            <button
              onClick={() => setSelectedId(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent active:bg-accent/80 transition-colors"
              aria-label="Back"
            >
              <span className="text-lg leading-none">←</span>
            </button>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold leading-none">
                {selectedConv?.customer_name ?? selectedConv?.customer_phone ?? 'Conversation'}
              </p>
              {selectedConv?.customer_name && selectedConv?.customer_phone && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/60 truncate">
                  {selectedConv.customer_phone}
                </p>
              )}
            </div>

            <button
              onClick={() => setDetailsOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent active:bg-accent/80 transition-colors"
              aria-label="Details"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          {/* Messages + input */}
          <ChatWindow
            messages={messages}
            isLoading={msgLoading}
            isAiActive={selectedConv?.is_ai_active ?? true}
            aiEnabled={aiEnabled}
            isResolved={selectedConv?.status === 'resolved'}
            isSending={isSending}
            onSend={handleSend}
            conversationId={selectedId}
          />
        </div>
      )}

      {/* ── Desktop Panel 2 + 3 ───────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col lg:flex-row min-w-0 h-full">
        <ChatWindow
          messages={messages}
          isLoading={msgLoading}
          isAiActive={selectedConv?.is_ai_active ?? true}
          aiEnabled={aiEnabled}
          isResolved={selectedConv?.status === 'resolved'}
          isSending={isSending}
          onSend={handleSend}
          onResolve={handleResolve}
          conversationId={selectedId}
          customerName={selectedConv?.customer_name}
          customerPhone={selectedConv?.customer_phone}
        />
        <div className="hidden lg:flex h-full">
          <ConversationDetails
            conversation={selectedConv}
            takeoverEvents={takeoverEvents}
            agents={agents}
            aiEnabled={aiEnabled}
            isAdmin={profile.role === 'admin'}
            onToggleAI={toggleAI}
            onUpdateConversation={handleUpdateConversation}
            onResolve={handleResolve}
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
                onResolve={handleResolve}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
