'use client'

import { useState, useRef, useEffect } from 'react'
import { cn, timeAgo, getInitial, getAvatarColor } from '@/lib/utils'
import { Search, Bot, User, SlidersHorizontal, Check, MessageCircle, CheckCheck, AlertTriangle } from 'lucide-react'
import { useQueueCount } from '@/features/inbox/hooks/useInboxData'
import type { Conversation } from '@/types/database'
import type { ConvFilter } from '@/types'

const FILTER_TABS: { key: ConvFilter; label: string }[] = [
  { key: 'all',          label: 'All'      },
  { key: 'needs_review', label: 'Queue'    },
  { key: 'resolved',     label: 'Resolved' },
]

/** Returns urgency level based on how long a conversation has been waiting */
function urgencyLevel(updatedAt: string): 'amber' | 'orange' | 'red' {
  const mins = (Date.now() - new Date(updatedAt).getTime()) / 60_000
  if (mins > 30) return 'red'
  if (mins > 15) return 'orange'
  return 'amber'
}

const URGENCY_STYLES = {
  amber:  { badge: 'text-amber-600 bg-amber-50 border-amber-200',   text: 'text-amber-600'  },
  orange: { badge: 'text-orange-600 bg-orange-50 border-orange-200', text: 'text-orange-600' },
  red:    { badge: 'text-red-600 bg-red-50 border-red-200',          text: 'text-red-600'    },
}

const HANDLING_OPTIONS = [
  { value: 'ai',    label: 'AI' },
  { value: 'human', label: 'Human' },
]

interface Props {
  conversations: Conversation[]
  lastMessages:  Record<string, { content: string; role: string }>
  isLoading:     boolean
  selectedId:    string | null
  filter:        ConvFilter
  onSelect:      (id: string) => void
  onFilterChange:(f: ConvFilter) => void
  search:        string
  onSearch:      (s: string) => void
}

export function ConversationList({
  conversations, lastMessages, isLoading, selectedId,
  filter, onSelect, onFilterChange, search, onSearch,
}: Props) {
  const [filterOpen, setFilterOpen]         = useState(false)
  const [handlingFilter, setHandlingFilter] = useState<string[]>([])
  const [pulse, setPulse]                   = useState(false)
  const dropdownRef  = useRef<HTMLDivElement>(null)
  const prevCount    = useRef(0)
  const { data: queueCount = 0 } = useQueueCount()

  // Trigger a brief pulse animation whenever the count increases (new item arrives)
  useEffect(() => {
    if (queueCount > prevCount.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 600)
      prevCount.current = queueCount
      return () => clearTimeout(t)
    }
    prevCount.current = queueCount
  }, [queueCount])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreadCount = conversations.filter(c => c.needs_human_review).length
  const hasFilters = handlingFilter.length > 0

  // Apply dropdown filters on top of tab filter
  const displayed = conversations.filter(c => {
    if (handlingFilter.length > 0) {
      const handling = c.is_ai_active ? 'ai' : 'human'
      if (!handlingFilter.includes(handling)) return false
    }
    return true
  })

  function toggleHandling(v: string) {
    setHandlingFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  return (
    <div className="flex h-full w-full lg:w-[300px] shrink-0 flex-col border-r border-border/50 bg-sidebar">

      {/* ── Header ───────────────────────────────────────────── */}
      {/* pl-16 on mobile = extra breathing room after the AppSidebar hamburger */}
      <div className="flex h-16 shrink-0 items-center justify-center gap-3 lg:justify-start lg:px-5">
        <h2 className="font-heading text-2xl leading-none">Inbox</h2>
        {isLoading ? (
          <span className="h-[22px] w-8 rounded-full skeleton-pulse" />
        ) : (
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold leading-none text-muted-foreground tabular-nums">
            {displayed.length}
          </span>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-border/50 bg-background/60 pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30"
          />
        </div>
      </div>

      {/* ── Filter tabs + dropdown ────────────────────────────── */}
      <div className="flex items-center px-3 pb-2 gap-1">
        <div className="flex flex-1 gap-1">
          {FILTER_TABS.map((tab) => {
            const isQueue  = tab.key === 'needs_review'
            const isActive = filter === tab.key
            // Badge: only on Queue tab, only when count > 0, hidden when tab is active
            const showBadge = isQueue && queueCount > 0 && !isActive
            return (
              <button
                key={tab.key}
                onClick={() => onFilterChange(tab.key)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 relative',
                  'inline-flex items-center justify-center gap-1.5',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {tab.label}
                {isQueue && (
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full bg-amber-500 text-white font-bold tabular-nums',
                      'min-w-[16px] h-[16px] px-1 text-[9px] leading-none',
                      'transition-all duration-300',
                      showBadge
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-75 pointer-events-none',
                      pulse && showBadge && 'animate-ping-once',
                    )}
                    aria-hidden={!showBadge}
                  >
                    {queueCount > 99 ? '99+' : queueCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Filter dropdown trigger */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
              filterOpen || hasFilters
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {hasFilters && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-border/60 bg-popover shadow-lg overflow-hidden">
              <div className="p-2">
                <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                  Handling
                </p>
                {HANDLING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleHandling(opt.value)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="flex-1 text-left text-xs">{opt.label}</span>
                    {handlingFilter.includes(opt.value) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <div className="border-t border-border/50 p-2">
                  <button
                    onClick={() => { setHandlingFilter([]) }}
                    className="w-full rounded-lg py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Conversation list ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="space-y-1 px-3 py-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-4">
                <div className="h-11 w-11 rounded-full skeleton-pulse shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-28 rounded skeleton-pulse" />
                  <div className="h-2.5 w-40 rounded skeleton-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <Search className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No conversations</p>
            <p className="mt-1.5 text-xs text-muted-foreground/50">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-0.5">
            {displayed.map((conv) => {
              const isSelected   = conv.id === selectedId
              const last         = lastMessages[conv.id]
              const avatarColor  = getAvatarColor(conv.id)
              const initial      = getInitial(conv.customer_name, conv.customer_phone)
              const isResolved   = conv.status === 'resolved'
              const isEscalated  = conv.needs_human_review && !isResolved
              const urgency      = isEscalated ? urgencyLevel(conv.updated_at) : 'amber'
              const urgencyStyle = URGENCY_STYLES[urgency]

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'w-full rounded-2xl px-3 py-3.5 text-left transition-all duration-150 group',
                    isSelected
                      ? 'bg-primary/10 border border-primary/15 shadow-sm'
                      : 'border border-transparent hover:bg-accent/70',
                    isResolved && !isSelected && 'opacity-55',
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar + status badge */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold',
                        isResolved ? 'opacity-50' : '',
                        avatarColor
                      )}>
                        {initial}
                      </div>
                      {/* Resolved > Escalated > AI/Human badge */}
                      {isResolved ? (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sidebar bg-muted shadow-sm">
                          <CheckCheck className="h-2.5 w-2.5 text-muted-foreground" />
                        </span>
                      ) : isEscalated ? (
                        <span className={cn(
                          'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sidebar shadow-sm',
                          urgency === 'red' ? 'bg-red-500 animate-pulse' : urgency === 'orange' ? 'bg-orange-500' : 'bg-amber-500'
                        )}>
                          <AlertTriangle className="h-2.5 w-2.5 text-white" />
                        </span>
                      ) : (
                        <span className={cn(
                          'absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sidebar shadow-sm',
                          conv.is_ai_active ? 'bg-success' : 'bg-muted-foreground/50'
                        )}>
                          {conv.is_ai_active
                            ? <Bot className="h-2.5 w-2.5 text-white" />
                            : <User className="h-2.5 w-2.5 text-white" />
                          }
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + time */}
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className={cn(
                          'truncate text-sm font-semibold leading-none',
                          isResolved ? 'text-muted-foreground' : 'text-foreground'
                        )}>
                          {conv.customer_name ?? conv.customer_phone ?? 'Unknown'}
                        </span>
                        <span className={cn(
                          'shrink-0 text-[11px] leading-none font-medium',
                          isEscalated ? urgencyStyle.text : 'text-muted-foreground/40'
                        )}>
                          {isResolved && conv.resolved_at
                            ? timeAgo(conv.resolved_at)
                            : timeAgo(conv.updated_at)}
                        </span>
                      </div>

                      {/* Resolved > Escalated > normal message preview */}
                      {isResolved ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCheck className="h-3 w-3 shrink-0 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground/40 italic">Resolved</p>
                        </div>
                      ) : isEscalated ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AlertTriangle className={cn('h-3 w-3 shrink-0', urgencyStyle.text)} />
                          <p className={cn('truncate text-xs font-medium', urgencyStyle.text)}>
                            {conv.escalation_reason ?? 'Waiting for human agent'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {last?.role === 'assistant' && (
                            <Bot className="h-3 w-3 shrink-0 text-primary/60" />
                          )}
                          {last?.role === 'agent' && (
                            <User className="h-3 w-3 shrink-0 text-warning/70" />
                          )}
                          {(!last || last.role === 'user') && (
                            <MessageCircle className="h-3 w-3 shrink-0 text-muted-foreground/35" />
                          )}
                          <p className="truncate text-xs text-muted-foreground/70">
                            {last?.content ?? 'No messages yet'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
