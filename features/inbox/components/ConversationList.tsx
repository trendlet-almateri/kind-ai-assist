'use client'

import { useState, useRef, useEffect } from 'react'
import { cn, timeAgo, getInitial, getAvatarColor } from '@/lib/utils'
import { Search, Bot, AlertTriangle, SlidersHorizontal, Check } from 'lucide-react'
import type { Conversation, ConvStatus } from '@/types/database'
import type { ConvFilter } from '@/types'

const FILTER_TABS: { key: ConvFilter; label: string }[] = [
  { key: 'all',            label: 'All'    },
  { key: 'open',           label: 'Open'   },
  { key: 'assigned_to_me', label: 'Mine'   },
  { key: 'needs_review',   label: 'Review' },
]

const STATUS_OPTIONS: { value: ConvStatus; label: string; color: string }[] = [
  { value: 'open',     label: 'Open',     color: 'bg-destructive' },
  { value: 'assigned', label: 'Assigned', color: 'bg-warning' },
  { value: 'resolved', label: 'Resolved', color: 'bg-success' },
  { value: 'closed',   label: 'Closed',   color: 'bg-muted-foreground' },
]

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
  const [filterOpen, setFilterOpen]   = useState(false)
  const [statusFilter, setStatusFilter] = useState<ConvStatus[]>([])
  const [handlingFilter, setHandlingFilter] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

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
  const hasFilters  = statusFilter.length > 0 || handlingFilter.length > 0

  // Apply dropdown filters on top of tab filter
  const displayed = conversations.filter(c => {
    if (statusFilter.length > 0 && !statusFilter.includes(c.status)) return false
    if (handlingFilter.length > 0) {
      const handling = c.is_ai_active ? 'ai' : 'human'
      if (!handlingFilter.includes(handling)) return false
    }
    return true
  })

  function toggleStatus(v: ConvStatus) {
    setStatusFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }
  function toggleHandling(v: string) {
    setHandlingFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-r border-border/50 bg-sidebar">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <h2 className="font-heading text-base tracking-tight">Inbox</h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-border/60 bg-input pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* ── Filter tabs + dropdown ────────────────────────────── */}
      <div className="flex items-center border-b border-border/50 px-3 gap-1">
        <div className="flex flex-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={cn(
                'flex-1 py-2 text-[11px] font-medium transition-colors border-b-2',
                filter === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
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
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Status
                </p>
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleStatus(opt.value)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', opt.color)} />
                    <span className="flex-1 text-left text-xs">{opt.label}</span>
                    {statusFilter.includes(opt.value) && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-border/50 p-2">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Handling
                </p>
                {HANDLING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleHandling(opt.value)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent transition-colors"
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
                    onClick={() => { setStatusFilter([]); setHandlingFilter([]) }}
                    className="w-full rounded-lg py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
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
          <div className="space-y-px p-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="h-10 w-10 rounded-full skeleton-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded skeleton-pulse" />
                  <div className="h-2.5 w-36 rounded skeleton-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
              <Search className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No conversations</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="p-2 space-y-px">
            {displayed.map((conv) => {
              const isSelected = conv.id === selectedId
              const last = lastMessages[conv.id]
              const avatarColor = getAvatarColor(conv.id)
              const initial = getInitial(conv.customer_name, conv.customer_phone)

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'w-full rounded-xl p-3 text-left transition-all duration-150 group',
                    isSelected
                      ? 'bg-primary/10 border border-primary/20'
                      : 'border border-transparent hover:bg-accent',
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                        avatarColor
                      )}>
                        {initial}
                      </div>
                      {/* AI/Human indicator dot */}
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-sidebar',
                        conv.is_ai_active ? 'bg-primary' : 'bg-muted-foreground/50'
                      )}>
                        <Bot className="h-2 w-2 text-white" />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className={cn(
                          'truncate text-[13px] font-semibold leading-none',
                          conv.needs_human_review ? 'text-warning' : 'text-foreground'
                        )}>
                          {conv.customer_name ?? conv.customer_phone ?? 'Unknown'}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground/60 leading-none">
                          {timeAgo(conv.updated_at)}
                        </span>
                      </div>

                      <p className="truncate text-[11px] text-muted-foreground leading-relaxed">
                        {last?.content ?? 'No messages yet'}
                      </p>

                      <div className="mt-1.5 flex items-center gap-1.5">
                        {/* Status badge */}
                        <span className={cn(
                          'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                          conv.status === 'open'     && 'bg-destructive/12 text-destructive',
                          conv.status === 'assigned' && 'bg-warning/12 text-warning',
                          conv.status === 'resolved' && 'bg-success/12 text-success',
                          conv.status === 'closed'   && 'bg-muted text-muted-foreground',
                        )}>
                          {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                        </span>

                        {conv.needs_human_review && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/12 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Review
                          </span>
                        )}
                      </div>
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
