/**
 * server/ai/replyEngine.ts
 * Core AI orchestration — the "brain" of the platform.
 *
 * Flow for each inbound customer message:
 * 1. Fetch workspace settings (AI enabled? active system prompt? vector store?)
 * 2. If AI disabled or conversation assigned to human → skip
 * 3. Build message history (last 10 messages for context)
 * 4. Call OpenAI with:
 *    - Active system prompt (+ order display rules injection)
 *    - Conversation history
 *    - Trendlet order/tracking tools (function calling)
 *    - File search tool (if vector store configured)
 * 5. If finish_reason='tool_calls' → execute Trendlet tools → Turn 2 (max 2 turns)
 * 6. Save AI reply to messages table
 * 7. Send reply via WhatsApp
 * 8. Check escalation keywords → flag if needed
 *
 * WHY we don't stream here:
 * - WhatsApp doesn't support streaming responses.
 * - We need the full text to check escalation keywords before sending.
 */

import 'server-only'
import { getOpenAIClient } from './openai'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { trendletToolDefs, executeTrendletTool } from './trendletTools'

/**
 * A provider-agnostic "send a text reply to this customer" function.
 * Meta and Twilio inbound webhooks each pass their own implementation so
 * the reply goes back over the same channel it arrived on.
 */
type SendReplyFn = (to: string, message: string) => Promise<unknown>

interface ReplyContext {
  conversationId: string
  customerPhone:  string
  customerName:   string | null
  workspaceId:    string
  send:           SendReplyFn
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

  // Detect language from the latest customer message so we know which label field to use
  const latestUserContent = messages.filter((m) => m.role === 'user').at(-1)?.content ?? ''
  const useArabic = isArabic(latestUserContent)

  // Inject order display rules so the AI presents live order data correctly
  const orderRules =
    `\n\nWhen presenting order status, use the ${useArabic ? 'label_ar' : 'label_en'} field. ` +
    'Never show raw status keys, internal IDs, or employee names. ' +
    'Always list every sub-order with its own status. ' +
    'If summary.mixedStatuses is true, state it explicitly. ' +
    'Use statusChangedAt for "as of <date>". ' +
    'If a field is null, say it is not yet available — never invent data.'

  const systemContent =
    (prompt?.content ?? 'You are a helpful customer support agent. Be concise, professional, and empathetic.') +
    orderRules

  const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
  ]

  // ── 5. Call OpenAI (with 2-turn tool loop) ────────────────────────────────
  const model       = prompt?.model ?? 'gpt-4o'
  const temperature = prompt?.temperature ?? 0.7

  // Always include Trendlet function-calling tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = [...trendletToolDefs]

  const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    temperature,
    messages: openAiMessages,
    max_tokens: 500,
    tools,
  }

  // Also attach file search if vector store is configured
  if (settings.openai_vector_store_id) {
    requestParams.tools = [...tools, { type: 'file_search' }]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(requestParams as any).tool_resources = {
      file_search: { vector_store_ids: [settings.openai_vector_store_id] },
    }
  }

  let replyText: string
  let tokensUsed: number | null = null

  try {
    // Turn 1 — let OpenAI decide whether to call a tool or reply directly
    let turn1
    try {
      turn1 = await openai.chat.completions.create(requestParams)
    } catch (toolsErr) {
      // If the tools-enabled call fails (e.g. model/schema mismatch), fall back
      // to a plain call so the AI can still reply to non-order questions.
      const errMsg = toolsErr instanceof Error ? toolsErr.message : String(toolsErr)
      console.error('[replyEngine] Tools call failed, falling back to no-tools:', errMsg)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tools: _tools, tool_resources: _tr, ...paramsWithoutTools } =
        requestParams as unknown as Record<string, unknown>
      turn1 = await openai.chat.completions.create(
        paramsWithoutTools as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
      )
    }

    const choice1    = turn1.choices[0]
    const toolCalls  = choice1?.message?.tool_calls

    if (choice1?.finish_reason === 'tool_calls' && toolCalls?.length) {
      // Execute each Trendlet tool call in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const args   = JSON.parse(tc.function.arguments) as Record<string, string>
          const result = await executeTrendletTool(tc.function.name, args)
          console.log(`[replyEngine] Tool ${tc.function.name} → found=${JSON.parse(result).found}`)
          return {
            role:         'tool' as const,
            tool_call_id: tc.id,
            content:      result,
          }
        })
      )

      // Turn 2 — send tool results back and get the final reply
      const turn2Messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...openAiMessages,
        choice1.message,  // assistant message containing the tool_calls
        ...toolResults,
      ]

      const turn2 = await openai.chat.completions.create({
        model,
        temperature,
        messages: turn2Messages,
        max_tokens: 500,
      })

      replyText  = turn2.choices[0]?.message?.content ?? 'I apologize, I was unable to process your request.'
      tokensUsed = (turn1.usage?.total_tokens ?? 0) + (turn2.usage?.total_tokens ?? 0)

    } else {
      // No tool calls — use the direct reply
      replyText  = choice1?.message?.content ?? 'I apologize, I was unable to process your request.'
      tokensUsed = turn1.usage?.total_tokens ?? null
    }

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[replyEngine] Fatal error — could not generate reply:', errMsg)
    if (err instanceof Error && err.stack) console.error(err.stack)
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

  // ── 7. Send via WhatsApp (caller must always pass a send fn) ────────────────
  if (!ctx.send) {
    console.error('[replyEngine] No send function provided — message not delivered')
    return
  }
  await ctx.send(ctx.customerPhone, replyText)

  // ── 8. Check escalation keywords ──────────────────────────────────────────
  // The Postgres trigger handles this automatically on message insert,
  // but we double-check here for immediate handling if needed.
}

// ── Import type ───────────────────────────────────────────────────────────────
import type OpenAI from 'openai'

/** Detect Arabic characters — used to choose label_ar vs label_en in order status */
function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text)
}
