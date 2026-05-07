/**
 * app/api/webhooks/whatsapp/route.ts
 * Meta WhatsApp Business webhook — Route Handler.
 *
 * WHY Route Handler (not Server Action):
 * - Meta calls this URL directly from their servers.
 * - It must handle both GET (webhook verification) and POST (events).
 * - Server Actions are POST-only and designed for form submissions.
 *
 * WHY admin client:
 * - This endpoint has no authenticated user — it's a machine-to-machine call.
 * - We use the service role key to write messages and conversations.
 * - Security is enforced by verifying Meta's verify token.
 *
 * Security:
 * - GET: verify token challenge (Meta's standard verification flow)
 * - POST: should verify X-Hub-Signature-256 header (TODO: add HMAC verify)
 *
 * Flow for each inbound message:
 * 1. Parse the webhook payload
 * 2. Find or create conversation for the sender's phone number
 * 3. Insert the message into the messages table
 * 4. Log raw payload to twilio_messages (for debugging)
 * 5. Trigger AI reply engine (async — don't block the webhook response)
 *
 * Meta requires a 200 response within 20 seconds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import { generateAndSendReply } from '@/server/ai/replyEngine'
import { markMessageAsRead } from '@/server/whatsapp/client'
import type { WhatsAppWebhookBody } from '@/types'

// ── GET — Webhook verification ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST — Incoming messages ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Respond 200 immediately — Meta retries if we take too long
  // We process asynchronously after returning
  let body: WhatsAppWebhookBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Process in background — don't await (Meta requires < 20s response)
  processWebhook(body).catch((err) => {
    console.error('[WhatsApp Webhook] Processing error:', err)
  })

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ── Core processing logic ─────────────────────────────────────────────────────
async function processWebhook(body: WhatsAppWebhookBody): Promise<void> {
  const db = getSupabaseAdminClient()

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value

      // Only process actual messages (not status updates)
      if (!value.messages?.length) continue

      for (const msg of value.messages) {
        // We only handle text messages for now
        if (msg.type !== 'text' || !msg.text?.body) continue

        const fromPhone   = msg.from
        const messageText = msg.text.body
        const messageId   = msg.id
        const profileName = value.contacts?.[0]?.profile?.name ?? null

        // ── 1. Find or create conversation ───────────────────────────────
        const { data: existingConv } = await db
          .from('conversations')
          .select('id, is_ai_active, customer_name, workspace_id')
          .eq('customer_phone', fromPhone)
          .is('deleted_at', null)
          .in('status', ['open', 'assigned'])
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        let conversationId: string
        let workspaceId: string

        if (existingConv) {
          conversationId = existingConv.id
          workspaceId    = existingConv.workspace_id

          // Update customer name if we now have it
          if (!existingConv.customer_name && profileName) {
            await db
              .from('conversations')
              .update({ customer_name: profileName })
              .eq('id', conversationId)
          }
        } else {
          // Get default workspace (for single-tenant, there's one workspace)
          const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .limit(1)
            .single()

          workspaceId = workspace?.id ?? 'default'

          const { data: newConv, error: convError } = await db
            .from('conversations')
            .insert({
              workspace_id:   workspaceId,
              channel:        'whatsapp',
              customer_phone: fromPhone,
              customer_name:  profileName,
              status:         'open',
              is_ai_active:   true,
              metadata:       {},
            })
            .select('id')
            .single()

          if (convError || !newConv) {
            console.error('[Webhook] Failed to create conversation:', convError)
            continue
          }

          conversationId = newConv.id
        }

        // ── 2. Insert inbound message ─────────────────────────────────────
        await db.from('messages').insert({
          workspace_id:    workspaceId,
          conversation_id: conversationId,
          role:            'user',
          content:         messageText,
          sender_name:     profileName,
          is_read:         false,
          metadata:        { whatsapp_message_id: messageId },
        })

        // ── 3. Log raw webhook payload ────────────────────────────────────
        await db.from('twilio_messages').insert({
          workspace_id:    workspaceId,
          message_sid:     messageId,
          from_number:     fromPhone,
          to_number:       process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
          body:            messageText,
          direction:       'inbound',
          profile_name:    profileName,
          conversation_id: conversationId,
          raw_payload:     body as unknown as Record<string, unknown>,
        })

        // ── 4. Mark as read ───────────────────────────────────────────────
        markMessageAsRead(messageId).catch(() => {})

        // ── 5. Trigger AI reply (only if is_ai_active) ────────────────────
        await generateAndSendReply({
          conversationId,
          customerPhone: fromPhone,
          customerName:  profileName,
          workspaceId,
        })
      }
    }
  }
}
