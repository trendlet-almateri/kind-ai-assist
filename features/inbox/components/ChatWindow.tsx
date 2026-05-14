'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, User, Cpu, Loader2, MessageSquare, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { cn, getDateLabel, formatTime } from '@/lib/utils'
import type { Message } from '@/types/database'

interface Props {
  messages:       Message[]
  isLoading:      boolean
  isAiActive:     boolean
  isSending:      boolean
  onSend:         (content: string) => Promise<void>
  conversationId: string | null
}

/** Detect if text is primarily RTL (Arabic, Hebrew, etc.) */
function isRTL(text: string): boolean {
  const rtlRegex = /[؀-ۿݐ-ݿ֐-׿]/
  return rtlRegex.test(text)
}

export function ChatWindow({ messages, isLoading, isAiActive, isSending, onSend, conversationId }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`
  }, [input])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isAiActive || isSending) return
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
      <div className="flex flex-1 flex-col items-center justify-center chat-pattern-bg">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 mb-4">
          <MessageSquare className="h-7 w-7 text-muted-foreground/25" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
        <p className="mt-1 text-xs text-muted-foreground/50">Choose from the list on the left</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col chat-pattern-bg min-w-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5">
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

              <div className="space-y-1.5">
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
                      className={cn('flex gap-2.5 items-end', isRight ? 'justify-end' : 'justify-start')}
                    >
                      {/* Customer avatar (left side) */}
                      {isCustomer && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border/50">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}

                      <div className={cn('max-w-[72%]', isRight && 'items-end flex flex-col')}>
                        {/* Bubble */}
                        <div className={cn(
                          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                          rtl && 'text-right',
                          isCustomer && 'bg-muted/70 border border-border/40 text-foreground rounded-bl-sm',
                          isAI       && 'bg-primary text-primary-foreground rounded-br-sm',
                          isAgent    && 'bg-warning/20 border border-warning/25 text-foreground rounded-br-sm',
                        )}>
                          <p dir={rtl ? 'rtl' : 'ltr'}>{msg.content}</p>
                        </div>

                        {/* Footer: time + model info */}
                        <div className={cn(
                          'mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/60',
                          isRight ? 'justify-end' : 'justify-start'
                        )}>
                          <span>{formatTime(msg.created_at)}</span>
                          {isAI && msg.model_used && (
                            <>
                              <span className="opacity-50">·</span>
                              <span className="opacity-70">{msg.model_used}</span>
                            </>
                          )}
                          {isAgent && (
                            <>
                              <span className="opacity-50">·</span>
                              <span className="text-warning/70">Agent</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* AI / Agent avatar (right side) */}
                      {isAI && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/20">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                      {isAgent && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/15 border border-warning/20">
                          <User className="h-3.5 w-3.5 text-warning" />
                        </div>
                      )}
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
      <div className="shrink-0 border-t border-border/50 bg-sidebar/80 backdrop-blur-md px-4 py-3">
        {isAiActive && (
          <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/15 px-3 py-2">
            <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs text-primary">AI is handling this conversation — take over to reply manually.</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAiActive || isSending}
            placeholder={isAiActive ? 'AI is handling this…' : 'Type a message… (Enter to send, Shift+Enter for new line)'}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border/60 bg-input px-3.5 py-2.5',
              'text-sm placeholder:text-muted-foreground/40 leading-relaxed',
              'focus:outline-none focus:ring-1 focus:ring-primary/40',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'min-h-[42px] max-h-32 overflow-y-auto custom-scrollbar',
            )}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAiActive || isSending}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              'bg-primary text-primary-foreground',
              'transition-all duration-150 hover:bg-primary/90 active:scale-95',
              'disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100',
            )}
          >
            {isSending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
