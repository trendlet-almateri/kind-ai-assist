/**
 * app/api/webhooks/twilio/route.ts
 * Twilio WhatsApp inbound webhook — Route Handler.
 *
 * Twilio delivers inbound WhatsApp messages as application/x-www-form-urlencoded
 * POSTs (NOT JSON, unlike Meta's webhook at /api/webhooks/whatsapp). Key fields:
 *   From            "whatsapp:+966..."   sender's WhatsApp number
 *   To              "whatsapp:+1..."     your Twilio sender
 *   Body            the message text
 *   MessageSid      "SM..." / "MM..."    unique message id
 *   ProfileName     the sender's WhatsApp display name (may be absent)
 *   NumMedia        "0" for text-only
 *
 * Configure in Twilio Console:
 *   Messaging → Senders → WhatsApp senders → [your sender]
 *   → Messaging Endpoint Configuration
 *   → "Webhook URL for incoming messages": https://kind-ai-assist.vercel.app/api/webhooks/twilio
 *   → method: HTTP POST
 *
 * Security: verify X-Twilio-Signature against TWILIO_AUTH_TOKEN.
 *
 * Flow:
 *   1. Read raw form body, verify signature
 *   2. Strip "whatsapp:" prefix from From
 *   3. Find or create conversation for that phone
 *   4. Insert inbound message + log raw payload to twilio_messages
 *   5. Trigger AI reply engine (passing the Twilio sender)
 *   6. Return empty 200 (Twilio also accepts TwiML, but we reply async)
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { generateAndSendReply } from '@/server/ai/replyEngine'
import {
  sendTwilioWhatsAppMessage,
  verifyTwilioSignature,
} from '@/server/whatsapp/twilio-client'

function stripWhatsAppPrefix(addr: string): string {
  return addr.startsWith('whatsapp:') ? addr.slice('whatsapp:'.length) : addr
}

export async function POST(req: NextRequest) {
  // Read the raw body so we can both verify the signature and parse params.
  const rawBody = await req.text()
  const form = new URLSearchParams(rawBody)
  const params: Record<string, string> = {}
  for (const [k, v] of form.entries()) params[k] = v

  // Twilio signs the *exact* URL it was configured with. NEXT_PUBLIC_APP_URL
  // is the canonical production origin; fall back to the request's own origin
  // for preview deployments / local dev.
  const configuredOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? new URL(req.url).origin
  const signedUrl = `${configuredOrigin}/api/webhooks/twilio`

  const signature = req.headers.get('x-twilio-signature')
  if (!verifyTwilioSignature(signature, signedUrl, params)) {
    console.warn('[Twilio Webhook] Signature verification failed', {
      hasSignature: !!signature,
      signedUrl,
      from: params.From,
    })
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const fromRaw = params.From ?? ''
  const toRaw = params.To ?? ''
  const messageText = params.Body ?? ''
  const messageSid = params.MessageSid ?? params.SmsMessageSid ?? ''
  const profileName = params.ProfileName?.trim() || null

  // Only handle text messages for now.
  if (!fromRaw || !messageText.trim()) {
    return new NextResponse('', { status: 200 })
  }

  const fromPhone = stripWhatsAppPrefix(fromRaw)
  const toPhone = stripWhatsAppPrefix(toRaw)

  // Process in background — keep the webhook response fast.
  processInbound({ fromPhone, toPhone, messageText, messageSid, profileName, rawParams: params }).catch(
    (err) => console.error('[Twilio Webhook] Processing error:', err),
  )

  return new NextResponse('', { status: 200 })
}

async function processInbound(opts: {
  fromPhone: string
  toPhone: string
  messageText: string
  messageSid: string
  profileName: string | null
  rawParams: Record<string, string>
}): Promise<void> {
  const { fromPhone, toPhone, messageText, messageSid, profileName, rawParams } = opts
  const db = getSupabaseAdminClient()

  // ── 1. Find or create conversation ──────────────────────────────────────
  const { data: existingConv } = await db
    .from('conversations')
    .select('id, is_ai_active, customer_name, workspace_id')
    .eq('customer_phone', fromPhone)
    .is('deleted_at', null)
    .in('status', ['open', 'assigned'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let conversationId: string
  let workspaceId: string

  if (existingConv) {
    conversationId = existingConv.id
    workspaceId = existingConv.workspace_id
    if (!existingConv.customer_name && profileName) {
      await db.from('conversations').update({ customer_name: profileName }).eq('id', conversationId)
    }
  } else {
    const { data: workspace } = await db.from('workspaces').select('id').limit(1).single()
    workspaceId = workspace?.id ?? 'default'

    const { data: newConv, error: convError } = await db
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        channel: 'whatsapp',
        customer_phone: fromPhone,
        customer_name: profileName,
        status: 'open',
        is_ai_active: true,
        metadata: {},
      })
      .select('id')
      .single()

    if (convError || !newConv) {
      console.error('[Twilio Webhook] Failed to create conversation:', convError)
      return
    }
    conversationId = newConv.id
  }

  // ── 2. Insert inbound message ───────────────────────────────────────────
  await db.from('messages').insert({
    workspace_id: workspaceId,
    conversation_id: conversationId,
    role: 'user',
    content: messageText,
    sender_name: profileName,
    is_read: false,
    metadata: { twilio_message_sid: messageSid },
  })

  // ── 3. Log raw payload ──────────────────────────────────────────────────
  await db.from('twilio_messages').insert({
    workspace_id: workspaceId,
    message_sid: messageSid,
    from_number: fromPhone,
    to_number: toPhone,
    body: messageText,
    direction: 'inbound',
    profile_name: profileName,
    conversation_id: conversationId,
    raw_payload: rawParams as unknown as Record<string, unknown>,
  })

  // ── 4. Trigger AI reply (only if is_ai_active — replyEngine checks this) ──
  await generateAndSendReply({
    conversationId,
    customerPhone: fromPhone,
    customerName: profileName,
    workspaceId,
    send: (to, msg) => sendTwilioWhatsAppMessage(to, msg),
  })
}
