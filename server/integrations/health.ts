/**
 * server/integrations/health.ts
 * Read-only health checks for the AI assistant's integrations.
 *
 * Every check is HTTP HEAD/GET against a free "shape only" endpoint —
 * no messages sent, no labels created, no AI tokens spent. Returned to
 * the Settings page so an admin can verify at a glance that the keys in
 * Vercel are present, correct, and reachable.
 *
 * Status semantics:
 *   "ok"          — env vars present, endpoint returned 2xx
 *   "missing"     — required env var(s) not configured
 *   "auth_failed" — env vars present, endpoint returned 401/403
 *   "error"       — env vars present, network/non-2xx/other failure
 */

import 'server-only'

export type HealthStatus = 'ok' | 'missing' | 'auth_failed' | 'error'

export interface IntegrationHealth {
  service: 'openai' | 'supabase' | 'twilio' | 'meta_whatsapp'
  label: string
  status: HealthStatus
  detail: string
  /** First 7 + last 4 chars of the relevant secret, or null when missing. */
  fingerprint: string | null
  latency_ms: number | null
}

/** Render a short safe fingerprint that never reveals the full secret. */
function fingerprint(value: string | undefined | null): string | null {
  if (!value) return null
  if (value.length <= 11) return `${value} (len ${value.length})`
  return `${value.slice(0, 7)}…${value.slice(-4)} (len ${value.length})`
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now()
  const result = await fn()
  return { result, ms: Date.now() - start }
}

// ── OpenAI ──────────────────────────────────────────────────────────────
export async function checkOpenAi(): Promise<IntegrationHealth> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return {
      service: 'openai',
      label: 'OpenAI',
      status: 'missing',
      detail: 'OPENAI_API_KEY not set',
      fingerprint: null,
      latency_ms: null,
    }
  }

  try {
    const { result: res, ms } = await timed(() =>
      fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      }),
    )
    if (res.status === 401 || res.status === 403) {
      return {
        service: 'openai',
        label: 'OpenAI',
        status: 'auth_failed',
        detail: `HTTP ${res.status} — key rejected`,
        fingerprint: fingerprint(key),
        latency_ms: ms,
      }
    }
    if (!res.ok) {
      return {
        service: 'openai',
        label: 'OpenAI',
        status: 'error',
        detail: `HTTP ${res.status}`,
        fingerprint: fingerprint(key),
        latency_ms: ms,
      }
    }
    const data = (await res.json()) as { data?: { id: string }[] }
    const count = data.data?.length ?? 0
    return {
      service: 'openai',
      label: 'OpenAI',
      status: 'ok',
      detail: `${count} models available`,
      fingerprint: fingerprint(key),
      latency_ms: ms,
    }
  } catch (err) {
    return {
      service: 'openai',
      label: 'OpenAI',
      status: 'error',
      detail: err instanceof Error ? err.message : 'network error',
      fingerprint: fingerprint(key),
      latency_ms: null,
    }
  }
}

// ── Supabase (service role) ─────────────────────────────────────────────
export async function checkSupabase(): Promise<IntegrationHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return {
      service: 'supabase',
      label: 'Supabase',
      status: 'missing',
      detail: !url ? 'NEXT_PUBLIC_SUPABASE_URL not set' : 'SUPABASE_SERVICE_ROLE_KEY not set',
      fingerprint: null,
      latency_ms: null,
    }
  }

  try {
    // Hit a known-cheap endpoint: GET /rest/v1/workspaces?select=id&limit=1
    // Returns 200 with [] or one row. Validates auth + DB reachability.
    const { result: res, ms } = await timed(() =>
      fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
      }),
    )
    if (res.status === 401 || res.status === 403) {
      return {
        service: 'supabase',
        label: 'Supabase',
        status: 'auth_failed',
        detail: `HTTP ${res.status} — service role key rejected`,
        fingerprint: fingerprint(key),
        latency_ms: ms,
      }
    }
    if (!res.ok) {
      return {
        service: 'supabase',
        label: 'Supabase',
        status: 'error',
        detail: `HTTP ${res.status}`,
        fingerprint: fingerprint(key),
        latency_ms: ms,
      }
    }
    return {
      service: 'supabase',
      label: 'Supabase',
      status: 'ok',
      detail: 'service role + DB reachable',
      fingerprint: fingerprint(key),
      latency_ms: ms,
    }
  } catch (err) {
    return {
      service: 'supabase',
      label: 'Supabase',
      status: 'error',
      detail: err instanceof Error ? err.message : 'network error',
      fingerprint: fingerprint(key),
      latency_ms: null,
    }
  }
}

// ── Twilio ──────────────────────────────────────────────────────────────
export async function checkTwilio(): Promise<IntegrationHealth> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM
  const missing: string[] = []
  if (!sid) missing.push('TWILIO_ACCOUNT_SID')
  if (!token) missing.push('TWILIO_AUTH_TOKEN')
  if (!from) missing.push('TWILIO_WHATSAPP_FROM')
  if (missing.length > 0) {
    return {
      service: 'twilio',
      label: 'Twilio',
      status: 'missing',
      detail: `not set: ${missing.join(', ')}`,
      fingerprint: null,
      latency_ms: null,
    }
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const { result: res, ms } = await timed(() =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      }),
    )
    if (res.status === 401) {
      return {
        service: 'twilio',
        label: 'Twilio',
        status: 'auth_failed',
        detail: 'HTTP 401 — SID or auth token rejected',
        fingerprint: fingerprint(token),
        latency_ms: ms,
      }
    }
    if (!res.ok) {
      return {
        service: 'twilio',
        label: 'Twilio',
        status: 'error',
        detail: `HTTP ${res.status}`,
        fingerprint: fingerprint(token),
        latency_ms: ms,
      }
    }
    const data = (await res.json()) as { friendly_name?: string; status?: string }
    return {
      service: 'twilio',
      label: 'Twilio',
      status: 'ok',
      detail: `account ${data.status ?? 'active'} · sender ${from}`,
      fingerprint: fingerprint(token),
      latency_ms: ms,
    }
  } catch (err) {
    return {
      service: 'twilio',
      label: 'Twilio',
      status: 'error',
      detail: err instanceof Error ? err.message : 'network error',
      fingerprint: fingerprint(token),
      latency_ms: null,
    }
  }
}

// ── Meta WhatsApp Business API ──────────────────────────────────────────
export async function checkMetaWhatsApp(): Promise<IntegrationHealth> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    return {
      service: 'meta_whatsapp',
      label: 'Meta WhatsApp',
      status: 'missing',
      detail: !phoneNumberId
        ? 'WHATSAPP_PHONE_NUMBER_ID not set'
        : 'WHATSAPP_ACCESS_TOKEN not set',
      fingerprint: null,
      latency_ms: null,
    }
  }

  try {
    // GET the phone number metadata — read-only, no charge.
    const { result: res, ms } = await timed(() =>
      fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    )
    if (res.status === 401 || res.status === 403) {
      return {
        service: 'meta_whatsapp',
        label: 'Meta WhatsApp',
        status: 'auth_failed',
        detail: `HTTP ${res.status} — token rejected`,
        fingerprint: fingerprint(accessToken),
        latency_ms: ms,
      }
    }
    if (!res.ok) {
      return {
        service: 'meta_whatsapp',
        label: 'Meta WhatsApp',
        status: 'error',
        detail: `HTTP ${res.status}`,
        fingerprint: fingerprint(accessToken),
        latency_ms: ms,
      }
    }
    const data = (await res.json()) as { display_phone_number?: string; verified_name?: string }
    const sender = data.verified_name ?? data.display_phone_number ?? 'connected'
    return {
      service: 'meta_whatsapp',
      label: 'Meta WhatsApp',
      status: 'ok',
      detail: sender,
      fingerprint: fingerprint(accessToken),
      latency_ms: ms,
    }
  } catch (err) {
    return {
      service: 'meta_whatsapp',
      label: 'Meta WhatsApp',
      status: 'error',
      detail: err instanceof Error ? err.message : 'network error',
      fingerprint: fingerprint(accessToken),
      latency_ms: null,
    }
  }
}

// ── Run all in parallel ─────────────────────────────────────────────────
export async function checkAllIntegrations(): Promise<IntegrationHealth[]> {
  return Promise.all([
    checkOpenAi(),
    checkSupabase(),
    checkTwilio(),
    checkMetaWhatsApp(),
  ])
}
