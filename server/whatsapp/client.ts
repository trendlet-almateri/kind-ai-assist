/**
 * server/whatsapp/client.ts
 * Meta WhatsApp Business API client — server-only.
 *
 * WHY abstracted into its own module:
 * - The API token and phone number ID are server secrets.
 * - Centralised so every part of the app uses the same send function.
 * - Easy to swap for a different provider (Twilio, etc.) later.
 */

import 'server-only'
import { WHATSAPP_API_BASE } from '@/lib/constants'

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  conversationId?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const phoneNumberId  = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken    = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.error('[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return { success: false, error: 'WhatsApp not configured' }
  }

  try {
    const res = await fetch(
      `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to,
          type:              'text',
          text:              { body: message },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[WhatsApp] Send failed:', data)
      return { success: false, error: data?.error?.message ?? 'Send failed' }
    }

    return {
      success:   true,
      messageId: data?.messages?.[0]?.id,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error'
    console.error('[WhatsApp] Exception:', msg)
    return { success: false, error: msg }
  }
}

/**
 * markMessageAsRead
 * Sends a read receipt so the customer sees the double-tick.
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return

  await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status:            'read',
      message_id:        messageId,
    }),
  }).catch(() => {
    // Non-critical — don't throw if read receipt fails
  })
}
