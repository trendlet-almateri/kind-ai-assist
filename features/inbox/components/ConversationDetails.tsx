'use client'

import {
  Bot, User, Phone, Shield, ArrowLeftRight, AlertTriangle,
  CheckCircle2, Activity, ChevronDown, ChevronLeft, ChevronRight,
  MessageCircle,
} from 'lucide-react'
import { useState } from 'react'
import { cn, formatDateTime, getInitial, getAvatarColor } from '@/lib/utils'
import type { Conversation, TakeoverEvent, AgentProfile } from '@/types/database'

const ACTIVITY_PAGE_SIZE = 5

interface Props {
  conversation:         Conversation | null
  takeoverEvents:       TakeoverEvent[]
  agents:               AgentProfile[]
  agentId?:             string
  aiEnabled:            boolean
  isAdmin:              boolean
  onToggleAI:           (id: string, active: boolean) => void
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void
}

export function ConversationDetails({
  conversation, takeoverEvents, agents, agentId, aiEnabled, isAdmin,
  onToggleAI, onUpdateConversation,
}: Props) {
  const [activityPage, setActivityPage] = useState(0)

  if (!conversation) {
    return (
      <div className="flex w-[260px] shrink-0 flex-col items-center justify-center border-l border-border/50 bg-sidebar p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
          <Activity className="h-5 w-5 text-muted-foreground/25" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No conversation selected</p>
        <p className="mt-1 text-xs text-muted-foreground/50">Select one to see details</p>
      </div>
    )
  }

  const assignedAgent    = agents.find((a) => a.id === conversation.assigned_agent)
  const avatarColor      = getAvatarColor(conversation.id)
  const initial          = getInitial(conversation.customer_name, conversation.customer_phone)
  const totalPages       = Math.ceil(takeoverEvents.length / ACTIVITY_PAGE_SIZE)
  const pagedEvents      = takeoverEvents.slice(
    activityPage * ACTIVITY_PAGE_SIZE,
    (activityPage + 1) * ACTIVITY_PAGE_SIZE
  )

  return (
    <div className="flex w-[260px] shrink-0 flex-col border-l border-border/50 bg-sidebar overflow-y-auto custom-scrollbar">

      {/* ── Customer header ────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-6 pb-5 border-b border-border/50">
        {/* Avatar */}
        <div className="relative mb-3">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold',
            avatarColor
          )}>
            {initial}
          </div>
          {/* Online indicator */}
          <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-sidebar bg-success" />
        </div>

        <p className="text-sm font-semibold text-foreground text-center leading-tight">
          {conversation.customer_name ?? 'Unknown'}
        </p>
        {conversation.customer_phone && (
          <p className="mt-0.5 text-xs text-muted-foreground">{conversation.customer_phone}</p>
        )}

        {/* WhatsApp button */}
        {conversation.customer_phone && (
          <a
            href={`https://wa.me/${conversation.customer_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/25 px-3 py-1.5 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        )}
      </div>

      {/* ── Assigned agent ─────────────────────────────────────── */}
      {isAdmin && (
        <div className="border-b border-border/50 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Assigned Agent
          </p>
          <select
            value={conversation.assigned_agent ?? ''}
            onChange={(e) => onUpdateConversation(conversation.id, {
              assigned_agent: e.target.value || null,
              status: e.target.value ? 'assigned' : 'open',
            })}
            className="w-full rounded-xl border border-border/60 bg-input px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── AI Status ──────────────────────────────────────────── */}
      <div className="border-b border-border/50 px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          AI Status
        </p>

        {/* Status display */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-2',
          conversation.is_ai_active
            ? 'bg-primary/8 border border-primary/15'
            : 'bg-muted/50 border border-border/50'
        )}>
          <span className={cn(
            'h-2 w-2 rounded-full shrink-0',
            conversation.is_ai_active
              ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)] animate-pulse'
              : 'bg-muted-foreground/40'
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-xs font-semibold leading-none',
              conversation.is_ai_active ? 'text-primary' : 'text-muted-foreground'
            )}>
              {conversation.is_ai_active ? 'Bot Active' : 'Bot Inactive'}
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-none">
              {conversation.is_ai_active ? 'Auto-reply on' : 'Auto-reply paused'}
            </p>
          </div>
        </div>

        {/* Take over button */}
        <button
          onClick={() => onToggleAI(conversation.id, conversation.is_ai_active)}
          disabled={!aiEnabled}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold',
            'border transition-all duration-150',
            conversation.is_ai_active
              ? 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15 active:scale-[0.98]'
              : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 active:scale-[0.98]',
            !aiEnabled && 'opacity-40 cursor-not-allowed active:scale-100'
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {conversation.is_ai_active ? 'Take Over Conversation' : 'Return to AI'}
        </button>

        {!aiEnabled && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            AI is globally disabled
          </p>
        )}
      </div>

      {/* ── Review Status ──────────────────────────────────────── */}
      <div className="border-b border-border/50 px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Review Status
        </p>

        {conversation.needs_human_review ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-warning">Needs Review</p>
                {conversation.escalation_reason && (
                  <p className="text-[10px] text-warning/70 mt-0.5 leading-relaxed">{conversation.escalation_reason}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onUpdateConversation(conversation.id, {
                needs_human_review: false,
                escalation_reason: null,
              })}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-success/10 border border-success/20 py-2 text-xs font-medium text-success hover:bg-success/15 transition-colors active:scale-[0.98]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark as Reviewed
            </button>
          </div>
        ) : (
          <button
            onClick={() => onUpdateConversation(conversation.id, { needs_human_review: true })}
            className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border/60 px-3 py-2.5 text-xs text-muted-foreground hover:border-warning/40 hover:text-warning transition-colors"
          >
            <div className="h-3.5 w-3.5 rounded border border-current flex items-center justify-center shrink-0">
              <Shield className="h-2 w-2" />
            </div>
            Flag for human review
          </button>
        )}
      </div>

      {/* ── Activity Log ───────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Activity Log
          </p>
          {takeoverEvents.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50">
              {takeoverEvents.length} events
            </span>
          )}
        </div>

        {takeoverEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 py-2">No activity yet</p>
        ) : (
          <>
            <div className="space-y-2">
              {pagedEvents.map((event) => {
                const agent = agents.find((a) => a.id === event.agent_id)
                const isHuman = event.event_type === 'human_took_over'
                return (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5',
                      isHuman
                        ? 'bg-warning/15 text-warning'
                        : 'bg-primary/15 text-primary'
                    )}>
                      {isHuman
                        ? <User className="h-3 w-3" />
                        : <Bot className="h-3 w-3" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">
                        {isHuman ? 'Human took over' : 'AI resumed'}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {agent?.full_name ?? 'Unknown'} · {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <button
                  onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                  disabled={activityPage === 0}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-muted-foreground/60">
                  {activityPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={activityPage >= totalPages - 1}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
