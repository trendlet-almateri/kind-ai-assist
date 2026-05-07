'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Bot, User, Cpu, Loader2, MessageSquare } from 'lucide-react'
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

const ROLE_CONFIG = {
  user: {
    align: 'justify-start',
    bubble: 'bg-bubble-customer border border-bubble-customer-border text-foreground',
    icon:  User,
    iconColor: 'text-muted-foreground',
  },
  assistant: {
    align: 'justify-start',
    bubble: 'bg-bubble-bot border border-bubble-bot-border text-foreground',
    icon:  Bot,
    iconColor: 'text-primary',
  },
  agent: {
    align: 'justify-end',
    bubble: 'bg-bubble-agent border border-bubble-agent-border text-foreground',
    icon:  User,
    iconColor: 'text-warning',
  },
  system: {
    align: 'justify-center',
    bubble: 'bg-muted/50 text-muted-foreground text-xs italic border border-border/40',
    icon:  Cpu,
    iconColor: 'text-muted-foreground',
  },
}

export function ChatWindow({ messages, isLoading, isAiActive, isSending, onSend, conversationId }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isAiActive || isSending) return
    setInput('')
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
        <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">Select a conversation</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col chat-pattern-bg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <div className="h-10 w-48 rounded-2xl skeleton-pulse" />
              </div>
            ))}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-3">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] text-muted-foreground font-medium px-2">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              {group.messages.map((msg) => {
                const cfg = ROLE_CONFIG[msg.role] ?? ROLE_CONFIG.user

                if (msg.role === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className={cn('px-3 py-1 rounded-full text-[10px]', cfg.bubble)}>
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={cn('flex gap-2 mb-2', cfg.align)}>
                    {msg.role !== 'agent' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-1">
                        <cfg.icon className={cn('h-3.5 w-3.5', cfg.iconColor)} />
                      </div>
                    )}
                    <div className="max-w-[70%]">
                      <div className={cn('rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', cfg.bubble)}>
                        {msg.content}
                      </div>
                      <p className={cn(
                        'mt-1 text-[10px] text-muted-foreground',
                        msg.role === 'agent' ? 'text-right' : 'text-left'
                      )}>
                        {formatTime(msg.created_at)}
                        {msg.model_used && (
                          <span className="ml-1 opacity-50">· {msg.model_used}</span>
                        )}
                      </p>
                    </div>
                    {msg.role === 'agent' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10 mt-1">
                        <User className="h-3.5 w-3.5 text-warning" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-md p-4">
        {isAiActive && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/15 px-3 py-2">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary">AI is handling this conversation. Take over to reply.</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAiActive || isSending}
            placeholder={isAiActive ? 'AI is handling this…' : 'Type a message… (Enter to send)'}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-input px-3.5 py-2.5',
              'text-sm placeholder:text-muted-foreground/50 leading-relaxed',
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
              'transition-all duration-150 hover:bg-primary/90',
              'disabled:opacity-40 disabled:cursor-not-allowed',
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
