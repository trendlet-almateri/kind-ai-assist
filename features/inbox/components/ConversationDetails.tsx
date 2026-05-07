'use client'

import { Bot, User, Globe, Mail, Phone, Shield, ArrowLeftRight, AlertTriangle, CheckCircle2, Activity, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn, formatDateTime } from '@/lib/utils'
import type { Conversation, TakeoverEvent, AgentProfile } from '@/types/database'

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
  const [activityOpen, setActivityOpen] = useState(true)

  if (!conversation) {
    return (
      <div className="flex w-72 shrink-0 flex-col items-center justify-center border-l border-border/50 p-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/20 mb-2" />
        <p className="text-xs text-muted-foreground">Select a conversation</p>
      </div>
    )
  }

  const assignedAgent = agents.find((a) => a.id === conversation.assigned_agent)

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border/50 overflow-y-auto custom-scrollbar">
      {/* ── AI Control ────────────────────────────────────────── */}
      <div className="border-b border-border/50 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          AI Control
        </p>
        <button
          onClick={() => onToggleAI(conversation.id, conversation.is_ai_active)}
          disabled={!aiEnabled}
          className={cn(
            'w-full flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium',
            'border transition-all duration-200',
            conversation.is_ai_active
              ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15'
              : 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/15',
            !aiEnabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="flex items-center gap-2">
            {conversation.is_ai_active
              ? <><Bot className="h-4 w-4" /> AI Active</>
              : <><User className="h-4 w-4" /> Human Active</>
            }
          </span>
          <ArrowLeftRight className="h-3.5 w-3.5 opacity-50" />
        </button>
        {!aiEnabled && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            AI is globally disabled in settings
          </p>
        )}
      </div>

      {/* ── Customer Info ──────────────────────────────────────── */}
      <div className="border-b border-border/50 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Customer
        </p>
        <div className="space-y-2">
          {conversation.customer_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{conversation.customer_name}</span>
            </div>
          )}
          {conversation.customer_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{conversation.customer_phone}</span>
            </div>
          )}
          {conversation.customer_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{conversation.customer_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="capitalize">{conversation.channel}</span>
          </div>
        </div>
      </div>

      {/* ── Status & Assignment ────────────────────────────────── */}
      {isAdmin && (
        <div className="border-b border-border/50 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Assignment
          </p>
          <select
            value={conversation.assigned_agent ?? ''}
            onChange={(e) => onUpdateConversation(conversation.id, {
              assigned_agent: e.target.value || null,
              status: e.target.value ? 'assigned' : 'open',
            })}
            className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Escalation ────────────────────────────────────────── */}
      {conversation.needs_human_review && (
        <div className="border-b border-border/50 p-4">
          <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-warning">Needs Review</p>
              {conversation.escalation_reason && (
                <p className="text-[11px] text-warning/80 mt-0.5">{conversation.escalation_reason}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onUpdateConversation(conversation.id, { needs_human_review: false, escalation_reason: null })}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl bg-success/10 border border-success/20 py-2 text-xs font-medium text-success hover:bg-success/15 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mark Resolved
          </button>
        </div>
      )}

      {/* ── Conversation metadata ──────────────────────────────── */}
      <div className="border-b border-border/50 p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Timeline
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Created</span>
            <span>{formatDateTime(conversation.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated</span>
            <span>{formatDateTime(conversation.updated_at)}</span>
          </div>
          {conversation.agent_last_reply_at && (
            <div className="flex justify-between">
              <span>Last reply</span>
              <span>{formatDateTime(conversation.agent_last_reply_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Takeover Activity ──────────────────────────────────── */}
      <div className="p-4">
        <button
          onClick={() => setActivityOpen(!activityOpen)}
          className="flex w-full items-center justify-between"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            AI/Human History ({takeoverEvents.length})
          </p>
          <ChevronDown className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform',
            activityOpen && 'rotate-180'
          )} />
        </button>

        {activityOpen && (
          <div className="mt-2 space-y-2">
            {takeoverEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events yet</p>
            ) : (
              takeoverEvents.map((event) => {
                const agent = agents.find((a) => a.id === event.agent_id)
                return (
                  <div key={event.id} className="flex items-start gap-2">
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5',
                      event.event_type === 'human_took_over'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-primary/15 text-primary'
                    )}>
                      {event.event_type === 'human_took_over'
                        ? <User className="h-2.5 w-2.5" />
                        : <Bot className="h-2.5 w-2.5" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">
                        {event.event_type === 'human_took_over' ? 'Human took over' : 'AI resumed'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {agent?.full_name ?? 'Unknown'} · {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
