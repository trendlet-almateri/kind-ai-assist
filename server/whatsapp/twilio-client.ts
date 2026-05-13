/**
 * server/whatsapp/twilio-client.ts
 * Twilio WhatsApp client — server-only.
 *
 * Parallel to server/whatsapp/client.ts (which targets Meta's Graph API).
 * This module talks to Twilio's Messages API instead. Pick the sender that
 * matches how the inbound webhook was wired:
 *   - app/api/webhooks/whatsapp  → Meta format    → sendWhatsAppMessage
 *   - app/api/webhooks/twilio     → Twilio format → sendTwilioWhatsAppMessage
 *
 * Env vars (set in Vercel, Production scope):
 *   TWILIO_ACCOUNT_SID    — starts with AC...
 *   TWILIO_AUTH_TOKEN     — the account auth token
 *   TWILIO_WHATSAPP_FROM  — e.g. "whatsapp:+14155238886" (your approved sender)
 */

import 'server-only'
import { createHmac } from 'node:crypto'

/**
 * Send a WhatsApp text message via Twilio.
 *
 * `to` may be passed with or without the "whatsapp:" prefix — we normalise.
 * Twilio expects E.164 ("+966...") behind the "whatsapp:" scheme.
 */
export async function sendTwilioWhatsAppMessage(
  to: string,
  message: string,
): Promise<{ success: boolean; error?: string; messageSid?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !from) {
    console.error('[Twilio] Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM')
    return { success: false, error: 'Twilio not configured' }
  }

  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`

  const params = new URLSearchParams()
  params.set('To', toAddr)
  params.set('From', fromAddr)
  params.set('Body', message)

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[Twilio] Send failed:', data)
      return { success: false, error: data?.message ?? `HTTP ${res.status}` }
    }

    return { success: true, messageSid: data?.sid }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    console.error('[Twilio] Exception:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Verify Twilio's X-Twilio-Signature header.
 *
 * Twilio signs the full request URL + the sorted POST params. The signature
 * is HMAC-SHA1 of (url + concatenated sorted "key+value" pairs) using the
 * auth token as the key, base64-encoded.
 *
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Returns true when the signature matches, false otherwise (including when
 * TWILIO_AUTH_TOKEN is unset — fail closed).
 */
export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken || !signature) return false

  // Build the signed string: full URL, then each param appended as key+value
  // in alphabetical key order, no separators.
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const expected = createHmac('sha1', authToken).update(data, 'utf8').digest('base64')

  // Constant-time-ish compare. Lengths first, then char-by-char.
  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}
