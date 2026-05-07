'use client'

import { cn, timeAgo, getInitial, getAvatarColor } from '@/lib/utils'
import { Search, Bot, AlertTriangle, User, MessageCircle, Globe } from 'lucide-react'
import type { Conversation, ConvStatus } from '@/types/database'
import type { ConvFilter } from '@/types'

const STATUS_CONFIG: Record<ConvStatus, { label: string; cls: string }> = {
  open:     { label: 'Open',     cls: 'bg-destructive/15 text-destructive border border-destructive/20' },
  assigned: { label: 'Assigned', cls: 'bg-warning/15 text-warning border border-warning/20' },
  resolved: { label: 'Resolved', cls: 'bg-success/15 text-success border border-success/20' },
  closed:   { label: 'Closed',   cls: 'bg-muted text-muted-foreground border border-border' },
}

const FILTER_TABS: { key: ConvFilter; label: string }[] = [
  { key: 'all',            label: 'All'    },
  { key: 'open',           label: 'Open'   },
  { key: 'assigned_to_me', label: 'Mine'   },
  { key: 'needs_review',   label: 'Review' },
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
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-border/50">
      {/* Search */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl border border-border bg-input pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border/50 px-2 pt-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              'flex-1 pb-2 text-xs font-medium transition-colors border-b-2',
              filter === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl skeleton-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => {
              const isSelected = conv.id === selectedId
              const last = lastMessages[conv.id]
              const avatarColor = getAvatarColor(conv.id)

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'w-full rounded-xl p-3 text-left transition-all duration-150',
                    'border border-transparent',
                    isSelected
                      ? 'bg-primary/10 border-primary/20 teal-accent-left'
                      : 'hover:bg-accent hover:border-border/50',
                    conv.needs_human_review && !isSelected && 'border-warning/20 bg-warning/5'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Avatar */}
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      avatarColor
                    )}>
                      {getInitial(conv.customer_name, conv.customer_phone)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold">
                          {conv.customer_name ?? conv.customer_phone ?? 'Unknown'}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(conv.updated_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {last?.content ?? 'No messages yet'}
                        </span>
                        <div className="shrink-0 flex items-center gap-1">
                          {conv.needs_human_review && (
                            <AlertTriangle className="h-3 w-3 text-warning" />
                          )}
                          {conv.is_ai_active
                            ? <Bot className="h-3 w-3 text-primary" />
                            : <User className="h-3 w-3 text-muted-foreground" />
                          }
                        </div>
                      </div>

                      <div className="mt-1">
                        <span className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                          STATUS_CONFIG[conv.status].cls
                        )}>
                          {STATUS_CONFIG[conv.status].label}
                        </span>
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
