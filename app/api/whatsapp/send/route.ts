/**
 * app/api/whatsapp/send/route.ts
 * Route handler for sending WhatsApp messages from the inbox.
 * Called by useSendMessage hook in the client.
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 15
import { getServerSession, createSupabaseServerClient } from '@/server/supabase/server'
import { sendWhatsAppMessage } from '@/server/whatsapp/client'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { conversation_id, message } = body as {
      conversation_id: string
      message:         string
    }

    if (!conversation_id || !message?.trim()) {
      return NextResponse.json({ error: 'conversation_id and message are required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Fetch the conversation to get the customer phone
    const { data: conversation, error: convErr } = await supabase
      .from('conversations')
      .select('id, customer_phone, workspace_id')
      .eq('id', conversation_id)
      .single()

    if (convErr || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Insert the agent message into DB
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        workspace_id: conversation.workspace_id,
        role:         'agent',
        content:      message.trim(),
        sender_name:  session.profile.full_name,
        is_read:      true,
        metadata:     {},
      })
      .select()
      .single()

    if (msgErr) {
      console.error('[send] DB insert error:', msgErr)
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Send via WhatsApp (non-blocking — we already saved the record)
    try {
      await sendWhatsAppMessage(conversation.customer_phone, message.trim())
    } catch (waErr) {
      console.error('[send] WhatsApp delivery error:', waErr)
      // Don't fail the request — message is saved, delivery is best-effort
    }

    // Mark conversation as assigned if it was open
    await supabase
      .from('conversations')
      .update({
        status:         'assigned',
        assigned_agent: session.profile.id,
        unread_count:   0,
      })
      .eq('id', conversation_id)
      .eq('status', 'open')   // only update if still open

    return NextResponse.json({ data: msg }, { status: 200 })
  } catch (err) {
    console.error('[send] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
