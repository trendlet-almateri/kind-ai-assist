'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, Cpu, Loader2, MessageSquare, Zap, CheckCheck, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { cn, getDateLabel, formatTime } from '@/lib/utils'
import type { Message } from '@/types/database'

interface Props {
  messages:           Message[]
  isLoading:          boolean
  isAiActive:         boolean
  aiEnabled:          boolean
  isResolved:         boolean
  isSending:          boolean
  onSend:             (content: string) => Promise<void>
  conversationId:     string | null
}

/** Detect if text is primarily RTL (Arabic, Hebrew, etc.) */
function isRTL(text: string): boolean {
  const rtlRegex = /[؀-ۿݐ-ݿ֐-׿]/
  return rtlRegex.test(text)
}

export function ChatWindow({ messages, isLoading, isAiActive, aiEnabled, isResolved, isSending, onSend, conversationId }: Props) {
  // Input is locked only when AI is BOTH per-conversation active AND globally enabled
  const inputLocked = isAiActive && aiEnabled
  const [input, setInput] = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevConvId  = useRef<string | null>(null)

  // Instant jump on conversation open, smooth scroll for new messages
  useEffect(() => {
    if (!bottomRef.current || messages.length === 0) return
    const isNewConv = conversationId !== prevConvId.current
    prevConvId.current = conversationId
    bottomRef.current.scrollIntoView({ behavior: isNewConv ? 'instant' : 'smooth' })
  }, [conversationId, messages.length])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`
  }, [input])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || inputLocked || isSending || isResolved) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      await onSend(text)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      toast.error(msg)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const grouped = useMemo(() => {
    const groups: { label: string; messages: Message[] }[] = []
    let currentLabel = ''
    for (const msg of messages) {
      const label = getDateLabel(msg.created_at)
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [messages])

  if (!conversationId) {
    return (
      <div className="flex flex-1 h-full flex-col items-center justify-center chat-pattern-bg min-w-0">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 mb-4">
          <MessageSquare className="h-7 w-7 text-muted-foreground/25" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
        <p className="mt-1 text-xs text-muted-foreground/50">Choose from the list on the left</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col chat-pattern-bg min-w-0 min-h-0">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-5 py-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'h-10 rounded-2xl skeleton-pulse',
                  i % 2 === 0 ? 'w-52' : 'w-44'
                )} />
              </div>
            ))}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-border/40" />
                <span className="shrink-0 rounded-full bg-muted/60 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <div className="space-y-2.5">
                {group.messages.map((msg) => {
                  if (msg.role === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="flex items-center gap-2 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5">
                          <Cpu className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground italic">{msg.content}</span>
                        </div>
                      </div>
                    )
                  }

                  const isCustomer  = msg.role === 'user'
                  const isAI        = msg.role === 'assistant'
                  const isAgent     = msg.role === 'agent'
                  const isRight     = isAI || isAgent
                  const rtl         = isRTL(msg.content)

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex items-end', isRight ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn('max-w-[72%]', isRight && 'items-end flex flex-col')}>
                        {/* Bubble */}
                        <div className={cn(
                          'rounded-2xl px-4 pt-2.5 pb-2 text-sm leading-relaxed',
                          rtl && 'text-right',
                          isCustomer && 'bg-muted/70 border border-border/40 text-foreground rounded-bl-sm',
                          isAI       && 'bg-primary text-primary-foreground rounded-br-sm',
                          isAgent    && 'bg-warning/20 border border-warning/25 text-foreground rounded-br-sm',
                        )}>
                          <p dir={rtl ? 'rtl' : 'ltr'}>{msg.content}</p>
                          {/* Time inside bubble */}
                          <p className={cn(
                            'mt-1 text-[10px] leading-none',
                            isRight ? 'text-left' : 'text-right',
                            isAI     && 'text-primary-foreground/50',
                            isAgent  && 'text-foreground/40',
                            isCustomer && 'text-muted-foreground/50',
                          )}>
                            {formatTime(msg.created_at)}
                            {isAgent && <span className="ml-1">· Agent</span>}
                          </p>
                        </div>

                        {/* AI chip + tokens — below bubble */}
                        {isAI && (
                          <div className={cn('mt-1 flex items-center gap-1.5', isRight ? 'justify-end' : 'justify-start')}>
                            <span className={cn(
                              'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]',
                              inputLocked ? 'bg-success/10' : 'bg-destructive/10'
                            )}>
                              <Bot className={cn('h-2.5 w-2.5', inputLocked ? 'text-success' : 'text-destructive')} />
                              <span className={cn('font-medium', inputLocked ? 'text-success/80' : 'text-destructive/80')}>
                                {msg.model_used ?? 'AI'}
                              </span>
                            </span>
                            {msg.tokens_used != null && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                                <Zap className="h-2.5 w-2.5 text-warning/60" />
                                <span>{msg.tokens_used}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/40 bg-sidebar px-3 py-3">
        {isResolved ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-muted/60 border border-border/40 px-4 py-3.5">
            <CheckCheck className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <p className="text-xs text-muted-foreground/50">
              Conversation resolved · reopen in details to reply
            </p>
          </div>
        ) : inputLocked ? (
          <div className="flex items-center justify-center gap-2.5 rounded-2xl bg-success/8 border border-success/20 px-4 py-3.5">
            <ShieldCheck className="h-4 w-4 text-success/70 shrink-0" />
            <p className="text-xs text-success/70 font-medium">
              AI is handling this · take over in details to reply
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Type a message…"
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-2xl border border-border/50 bg-background/80 px-4 py-3',
                'text-sm placeholder:text-muted-foreground/35 leading-relaxed',
                'focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30',
                'min-h-[46px] max-h-32 overflow-y-hidden',
              )}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className={cn(
                'flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl',
                'bg-primary text-primary-foreground',
                'transition-all duration-150 hover:bg-primary/90 active:scale-95',
                'disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100',
              )}
            >
              {isSending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-[17px] w-[17px]" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
