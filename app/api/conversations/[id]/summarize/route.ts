/**
 * app/api/conversations/[id]/summarize/route.ts
 * POST — Generate AI-safe + internal summaries when a conversation is resolved.
 *
 * Called fire-and-forget from useResolveConversation after a successful resolve.
 * Failure is non-fatal: conversation resolves regardless, next session just has no summary.
 *
 * Two summaries are generated in parallel:
 *   conversation_summary_ai       — sanitized facts only, injected into OpenAI context
 *   conversation_summary_internal — full operational detail, agents/admins only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { getServerSession } from '@/server/supabase/server'
import OpenAI from 'openai'

export const maxDuration = 30

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — must be a logged-in agent/admin
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: conversationId } = await params
  const db = getSupabaseAdminClient()

  // Fetch all messages for this conversation
  const { data: messages, error: msgErr } = await db
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgErr) {
    console.error('[summarize] Failed to fetch messages:', msgErr.message)
    return NextResponse.json({ error: msgErr.message }, { status: 500 })
  }

  if (!messages?.length) {
    return NextResponse.json({ ok: true, reason: 'no messages' })
  }

  // Build transcript — customer/support only, exclude system messages
  const transcript = messages
    .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'agent')
    .map(m => `${m.role === 'user' ? 'Customer' : 'Support'}: ${m.content}`)
    .join('\n')

  if (!transcript.trim()) {
    return NextResponse.json({ ok: true, reason: 'empty transcript' })
  }

  const openai = getOpenAI()

  try {
    // Generate both summaries in parallel
    const [aiRes, internalRes] = await Promise.all([
      // AI-safe summary — sanitized, no escalation content
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate a concise support memory summary for future AI assistants.\n\n' +
              'Rules:\n' +
              '- Include only durable customer context that improves future support interactions.\n' +
              '- Include: factual order/issue outcomes, customer preferences (e.g. preferred language), successful resolutions.\n' +
              '- Do NOT include: escalation events, requests for human agents, emotional states, frustration, anger, operational handling details, agent interventions, human takeover events, or any behavioral context.\n' +
              '- If the only notable events were escalation-related, output only factual order/preference facts. If there are none, output an empty string.\n' +
              '- Keep it short (1–3 sentences), neutral, and reusable.\n\n' +
              'Example GOOD: "Previous shipment issue was resolved successfully. Customer prefers Arabic responses."\n' +
              'Example BAD: "Customer requested human assistance. Customer became frustrated."',
          },
          { role: 'user', content: `Conversation transcript:\n${transcript}` },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
      // Internal summary — full operational detail for agents/admins
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate an internal support summary for agents and admins.\n' +
              'Include all relevant details: escalation reasons, agent interventions, customer behavior, resolution steps, and operational notes.\n' +
              'Be factual and complete.',
          },
          { role: 'user', content: `Conversation transcript:\n${transcript}` },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    ])

    const summaryAi       = aiRes.choices[0]?.message?.content?.trim() || null
    const summaryInternal = internalRes.choices[0]?.message?.content?.trim() || null

    const { error: updateErr } = await db
      .from('conversations')
      .update({
        conversation_summary_ai:       summaryAi,
        conversation_summary_internal: summaryInternal,
      })
      .eq('id', conversationId)

    if (updateErr) {
      console.error('[summarize] Failed to save summaries:', updateErr.message)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    console.log(`[summarize] Generated summaries for conv ${conversationId}`)
    return NextResponse.json({ ok: true })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[summarize] OpenAI error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
