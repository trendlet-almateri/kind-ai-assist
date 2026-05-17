'use client'

import {
  UserCheck, Shield, AlertTriangle,
  CheckCircle2, Activity, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Phone, Sparkles, Check, CheckCheck, RotateCcw,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn, formatDateTime, getInitial, getAvatarColor } from '@/lib/utils'
import type { Conversation, TakeoverEvent, AgentProfile } from '@/types/database'

const ACTIVITY_PAGE_SIZE = 5

interface Props {
  conversation:         Conversation | null
  takeoverEvents:       TakeoverEvent[]
  agents:               AgentProfile[]
  aiEnabled:            boolean
  isAdmin:              boolean
  onToggleAI:           (id: string, active: boolean) => void
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void
  onResolve:            (id: string, reopen?: boolean) => void
}

function SectionCard({ icon: Icon, label, children, className }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mx-3 mb-2 rounded-xl border border-border/60 bg-card/60 p-3', className)}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5 text-primary/70" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{label}</p>
      </div>
      {children}
    </div>
  )
}

export function ConversationDetails({
  conversation, takeoverEvents, agents, aiEnabled, isAdmin,
  onToggleAI, onUpdateConversation, onResolve,
}: Props) {
  const [activityPage, setActivityPage]     = useState(0)
  const [activityOpen, setActivityOpen]     = useState(false)
  const [agentDropOpen, setAgentDropOpen]   = useState(false)
  const agentDropRef                        = useRef<HTMLDivElement>(null)

  // Reset activity page + auto-open log only when events exist
  useEffect(() => {
    setActivityPage(0)
    setActivityOpen(takeoverEvents.length > 0)
  }, [conversation?.id, takeoverEvents.length])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (agentDropRef.current && !agentDropRef.current.contains(e.target as Node)) {
        setAgentDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!conversation) {
    return (
      <div className="flex h-full w-full lg:w-[300px] shrink-0 flex-col items-center justify-center lg:border-l lg:border-border/50 bg-sidebar p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40">
          <Activity className="h-5 w-5 text-muted-foreground/25" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No conversation selected</p>
        <p className="mt-1 text-xs text-muted-foreground/50">Select one to see details</p>
      </div>
    )
  }

  const avatarColor    = getAvatarColor(conversation.id)
  const initial        = getInitial(conversation.customer_name, conversation.customer_phone)
  const totalPages     = Math.ceil(takeoverEvents.length / ACTIVITY_PAGE_SIZE)
  const recentlyActive = Date.now() - new Date(conversation.updated_at).getTime() < 30 * 60 * 1000
  const isWhatsApp     = conversation.channel === 'whatsapp'
  const isResolved     = conversation.status === 'resolved'
  const pagedEvents = takeoverEvents.slice(
    activityPage * ACTIVITY_PAGE_SIZE,
    (activityPage + 1) * ACTIVITY_PAGE_SIZE
  )

  return (
    <div className="flex h-full w-full lg:w-[300px] shrink-0 flex-col lg:border-l lg:border-border/50 bg-sidebar overflow-y-auto custom-scrollbar">

      {/* ── Customer header ────────────────────────────────────── */}
      <div className="flex flex-col items-center px-4 pt-6 pb-5">
        <div className="relative mb-3">
          <div className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold',
            avatarColor
          )}>
            {initial}
          </div>
          {recentlyActive && (
            <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-sidebar bg-success" />
          )}
        </div>

        <p className="text-sm font-bold text-foreground text-center leading-tight">
          {conversation.customer_name ?? 'Unknown'}
        </p>
        {conversation.customer_phone && (
          <div className="mt-1 flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground/70">{conversation.customer_phone}</p>
          </div>
        )}

        {isWhatsApp && (
          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#25D366]/15 border border-[#25D366]/25 px-4 py-1.5 text-xs font-semibold text-[#25D366] uppercase tracking-wide select-none">
            {/* Official WhatsApp SVG icon */}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </div>
        )}
      </div>

      {/* ── Assigned Agent ─────────────────────────────────────── */}
      {isAdmin && (
        <SectionCard icon={UserCheck} label="Assigned Agent">
          <div className="relative" ref={agentDropRef}>
            {/* Trigger */}
            <button
              onClick={() => setAgentDropOpen(v => !v)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
                agentDropOpen
                  ? 'border-primary/40 bg-input ring-1 ring-primary/20'
                  : 'border-border/60 bg-input hover:border-border'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {conversation.assigned_agent ? (
                  <>
                    {/* Online dot */}
                    <span className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      agents.find(a => a.id === conversation.assigned_agent)?.is_online
                        ? 'bg-success' : 'bg-muted-foreground/40'
                    )} />
                    <span className="truncate font-medium text-foreground">
                      {agents.find(a => a.id === conversation.assigned_agent)?.full_name ?? 'Unknown'}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground/60">Unassigned</span>
                )}
              </div>
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform', agentDropOpen && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            {agentDropOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border/60 bg-popover shadow-lg">
                {/* Unassigned option */}
                <button
                  onClick={() => {
                    onUpdateConversation(conversation.id, { assigned_agent: null, status: 'open' })
                    setAgentDropOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-accent',
                    !conversation.assigned_agent && 'bg-accent/60'
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                  <span className={cn('flex-1 text-left', !conversation.assigned_agent ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    Unassigned
                  </span>
                  {!conversation.assigned_agent && <Check className="h-3 w-3 text-primary" />}
                </button>

                {/* Divider */}
                {agents.length > 0 && <div className="border-t border-border/40" />}

                {/* Agent options */}
                {agents.map((agent) => {
                  const isSelected = conversation.assigned_agent === agent.id
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onUpdateConversation(conversation.id, { assigned_agent: agent.id, status: 'assigned' })
                        setAgentDropOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-accent',
                        isSelected && 'bg-accent/60'
                      )}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                          {agent.full_name.charAt(0)}
                        </div>
                        <span className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-popover',
                          agent.is_online ? 'bg-success' : 'bg-muted-foreground/30'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={cn('truncate', isSelected ? 'font-medium text-foreground' : 'text-foreground/80')}>
                          {agent.full_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 capitalize">{agent.role}</p>
                      </div>
                      {isSelected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ── AI Status ──────────────────────────────────────────── */}
      <SectionCard icon={Sparkles} label="AI Status" className="border-primary/20">
        {/* Status row */}
        <div className="flex items-center gap-2.5 mb-3">
          <span className={cn(
            'h-3 w-3 rounded-full shrink-0',
            conversation.is_ai_active
              ? 'bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
              : 'bg-destructive/80'
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-xs font-bold leading-none',
              conversation.is_ai_active ? 'text-primary' : 'text-destructive'
            )}>
              {conversation.is_ai_active ? 'Bot Active' : 'Bot Inactive'}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-none">
              {conversation.is_ai_active ? 'Auto-reply on' : 'Auto-reply is paused'}
            </p>
          </div>
        </div>

        {/* Take Over / Return button */}
        <button
          onClick={() => onToggleAI(conversation.id, conversation.is_ai_active)}
          disabled={!aiEnabled || isResolved}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold',
            'border transition-all duration-150 active:scale-[0.98]',
            'bg-foreground/90 border-border text-background hover:bg-foreground',
            !aiEnabled && 'opacity-40 cursor-not-allowed active:scale-100'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          {conversation.is_ai_active ? 'Take Over Conversation' : 'Return to AI'}
        </button>

        {!aiEnabled && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
            AI is globally disabled
          </p>
        )}
      </SectionCard>

      {/* ── Review Status ──────────────────────────────────────── */}
      <SectionCard icon={CheckCircle2} label="Review Status">
        {conversation.needs_human_review ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-warning">Needs Review</p>
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
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-success/10 border border-success/20 py-2 text-xs font-semibold text-success hover:bg-success/15 transition-colors active:scale-[0.98]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark as Reviewed
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 shrink-0 rounded border border-border/60 flex items-center justify-center">
              <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">No Review Needed</p>
              <p className="text-[10px] text-muted-foreground/50">All clear</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Resolve / Reopen ───────────────────────────────────── */}
      <SectionCard icon={CheckCheck} label="Conversation">
        {isResolved ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5">
              <CheckCheck className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground/80">Resolved</p>
                {conversation.resolved_at && (
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {new Date(conversation.resolved_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onResolve(conversation.id, true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-border/60 py-2.5 text-xs font-semibold text-foreground/80 hover:bg-accent transition-colors active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen Conversation
            </button>
          </div>
        ) : (
          <button
            onClick={() => onResolve(conversation.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-success/10 border border-success/25 py-2.5 text-xs font-semibold text-success hover:bg-success/15 transition-colors active:scale-[0.98]"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Resolve Conversation
          </button>
        )}
      </SectionCard>

      {/* ── Activity Log ───────────────────────────────────────── */}
      <div className="mx-3 mb-3 rounded-xl border border-border/60 bg-card/60">
        {/* Header — toggles collapse */}
        <button
          onClick={() => setActivityOpen(v => !v)}
          className="flex w-full items-center justify-between px-3 py-3 text-left"
        >
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary/70" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Activity Log</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {takeoverEvents.length}
            </span>
            {activityOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
            }
          </div>
        </button>

        {activityOpen && (
          <div className="px-3 pb-3">
            {takeoverEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground/40 py-1">No activity yet</p>
            ) : (
              <>
                <div className="space-y-3">
                  {pagedEvents.map((event) => {
                    const agent   = agents.find((a) => a.id === event.agent_id)
                    const isHuman = event.event_type === 'human_took_over'
                    const name    = agent?.full_name ?? 'Unknown'
                    const initial = name.charAt(0).toUpperCase()
                    return (
                      <div key={event.id} className="flex items-start gap-2.5">
                        {/* Agent avatar */}
                        <div className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          isHuman
                            ? 'bg-warning/20 text-warning'
                            : 'bg-primary/20 text-primary'
                        )}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">
                            <span className="font-bold text-foreground">{name}</span>
                            <span className="text-muted-foreground/70">
                              {isHuman ? ' took over' : ' returned to AI'}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 mt-0.5 tabular-nums">
                            {formatDateTime(event.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                    <button
                      onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                      disabled={activityPage === 0}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-muted-foreground/50">
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
        )}
      </div>

    </div>
  )
}
