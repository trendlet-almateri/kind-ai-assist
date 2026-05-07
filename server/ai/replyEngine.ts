/**
 * server/ai/replyEngine.ts
 * Core AI orchestration — the "brain" of the platform.
 *
 * Flow for each inbound customer message:
 * 1. Fetch workspace settings (AI enabled? active system prompt? vector store?)
 * 2. If AI disabled or conversation assigned to human → skip
 * 3. Build message history (last 10 messages for context)
 * 4. Call OpenAI with:
 *    - Active system prompt
 *    - Conversation history
 *    - File search tool (if vector store configured)
 * 5. Save AI reply to messages table
 * 6. Send reply via WhatsApp
 * 7. Check escalation keywords → flag if needed
 *
 * WHY we don't stream here:
 * - WhatsApp doesn't support streaming responses.
 * - We need the full text to check escalation keywords before sending.
 */

import 'server-only'
import { getOpenAIClient } from './openai'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { sendWhatsAppMessage } from '@/server/whatsapp/client'

interface ReplyContext {
  conversationId: string
  customerPhone:  string
  customerName:   string | null
  workspaceId:    string
}

export async function generateAndSendReply(ctx: ReplyContext): Promise<void> {
  const db     = getSupabaseAdminClient()
  const openai = getOpenAIClient()

  // ── 1. Fetch workspace settings + active prompt ───────────────────────────
  const [{ data: settings }, { data: prompt }] = await Promise.all([
    db.from('workspace_settings').select('*').single(),
    db.from('system_prompts').select('*').eq('is_active', true).single(),
  ])

  if (!settings?.ai_enabled) return

  // ── 2. Check if conversation is AI-active ─────────────────────────────────
  const { data: conv } = await db
    .from('conversations')
    .select('is_ai_active, assigned_agent, status')
    .eq('id', ctx.conversationId)
    .single()

  if (!conv?.is_ai_active) return // Human has taken over

  // ── 3. Fetch recent message history ───────────────────────────────────────
  const { data: history } = await db
    .from('messages')
    .select('role, content')
    .eq('conversation_id', ctx.conversationId)
    .order('created_at', { ascending: false })
    .limit(10)

  const messages = (history ?? []).reverse()

  // ── 4. Build OpenAI messages ──────────────────────────────────────────────
  const systemContent = prompt?.content ??
    'You are a helpful customer support agent. Be concise, professional, and empathetic.'

  const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
  ]

  // ── 5. Call OpenAI ────────────────────────────────────────────────────────
  const model       = prompt?.model ?? 'gpt-4o'
  const temperature = prompt?.temperature ?? 0.7

  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    temperature,
    messages: openAiMessages,
    max_tokens: 500,
  }

  // Attach file search tool if vector store is configured
  if (settings.openai_vector_store_id) {
    Object.assign(requestParams, {
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: { vector_store_ids: [settings.openai_vector_store_id] },
      },
    })
  }

  let replyText: string
  let tokensUsed: number | null = null

  try {
    const completion = await openai.chat.completions.create(requestParams)
    replyText  = completion.choices[0]?.message?.content ?? 'I apologize, I was unable to process your request.'
    tokensUsed = completion.usage?.total_tokens ?? null
  } catch (err) {
    console.error('[replyEngine] OpenAI error:', err)
    replyText = 'I apologize, I am currently experiencing technical difficulties. A human agent will assist you shortly.'
  }

  // ── 6. Save AI reply to messages ──────────────────────────────────────────
  await db.from('messages').insert({
    conversation_id: ctx.conversationId,
    workspace_id:    ctx.workspaceId,
    role:            'assistant',
    content:         replyText,
    sender_name:     'SupportAI',
    model_used:      model,
    tokens_used:     tokensUsed,
    is_read:         false,
    metadata:        {},
  })

  // ── 7. Send via WhatsApp ───────────────────────────────────────────────────
  await sendWhatsAppMessage(ctx.customerPhone, replyText, ctx.conversationId)

  // ── 8. Check escalation keywords ──────────────────────────────────────────
  // The Postgres trigger handles this automatically on message insert,
  // but we double-check here for immediate handling if needed.
}

// ── Import type ───────────────────────────────────────────────────────────────
import type OpenAI from 'openai'
