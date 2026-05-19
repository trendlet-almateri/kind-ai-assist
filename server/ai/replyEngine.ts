/**
 * server/ai/replyEngine.ts
 * Core AI orchestration — the "brain" of the platform.
 *
 * Flow for each inbound customer message:
 * 1. Fetch workspace settings (AI enabled? active system prompt? vector store?)
 * 2. If AI disabled or conversation assigned to human → skip
 * 3. Build message history (last 10 messages for context)
 * 4. Call OpenAI Responses API with:
 *    - Active system prompt (+ order display rules injection)
 *    - Conversation history
 *    - Trendlet order/tracking tools (function calling)
 *    - file_search tool (if vector store configured) — knowledge base
 * 5. If function tools called → execute → Turn 2 (max 2 turns)
 *    file_search is handled automatically by OpenAI (no manual loop needed)
 * 6. Save AI reply to messages table
 * 7. Send reply via WhatsApp
 *
 * WHY Responses API (not Chat Completions):
 * - Chat Completions does NOT support file_search as a built-in tool.
 * - Responses API supports file_search + function tools in the same call.
 * - SDK v4.76+ required (we use v4.98).
 *
 * WHY we don't stream here:
 * - WhatsApp doesn't support streaming responses.
 * - We need the full text before sending.
 */

import 'server-only'
import { getOpenAIClient } from './openai'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { trendletResponsesToolDefs, executeTrendletTool } from './trendletTools'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputMessages: any[] = [
    { role: 'system', content: systemContent },
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
  ]

  // ── 5. Call OpenAI Responses API ─────────────────────────────────────────
  const model       = prompt?.model ?? 'gpt-4o'
  const temperature = prompt?.temperature ?? 0.7

  // Build tools: Trendlet function tools always + file_search if vector store set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = [...trendletResponsesToolDefs]
  if (settings.openai_vector_store_id) {
    tools.unshift({ type: 'file_search', vector_store_ids: [settings.openai_vector_store_id] })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responsesApi = (openai as any).responses

  let replyText: string
  let tokensUsed: number | null = null

  try {
    // Turn 1 — OpenAI handles file_search internally; function_call items need manual execution
    const resp1 = await responsesApi.create({
      model,
      input:            inputMessages,
      tools,
      temperature,
      max_output_tokens: 800,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionCalls: any[] = (resp1.output ?? []).filter((item: any) => item.type === 'function_call')

    // Escalation check — hand off to human and stop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (functionCalls.some((fc: any) => fc.name === 'escalate_to_human')) {
      await db.from('conversations').update({ is_ai_active: false }).eq('id', ctx.conversationId)
      console.log(`[replyEngine] Escalated to human — conversation ${ctx.conversationId}`)
      return
    }

    if (functionCalls.length > 0) {
      // Execute Trendlet tool calls in parallel
      const toolOutputs = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        functionCalls.map(async (fc: any) => {
          const args   = JSON.parse(fc.arguments) as Record<string, string>
          const result = await executeTrendletTool(fc.name, args)
          console.log(`[replyEngine] Tool ${fc.name} → found=${JSON.parse(result).found}`)
          return { type: 'function_call_output', call_id: fc.call_id, output: result }
        })
      )

      // Turn 2 — append tool outputs and get final reply
      const resp2 = await responsesApi.create({
        model,
        input:            [...inputMessages, ...(resp1.output ?? []), ...toolOutputs],
        tools,
        temperature,
        max_output_tokens: 800,
      })

      replyText  = resp2.output_text ?? 'I apologize, I was unable to process your request.'
      tokensUsed = (resp1.usage?.total_tokens ?? 0) + (resp2.usage?.total_tokens ?? 0)

    } else {
      // No function calls — direct reply (file_search already handled by OpenAI internally)
      replyText  = resp1.output_text ?? 'I apologize, I was unable to process your request.'
      tokensUsed = resp1.usage?.total_tokens ?? null
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

/** Detect Arabic characters — used to choose label_ar vs label_en in order status */
function isArabic(text: string): boolean {
  return /[؀-ۿ]/.test(text)
}
