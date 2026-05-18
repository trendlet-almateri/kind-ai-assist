/**
 * server/ai/trendletClient.ts
 * Typed HTTP client for the Trendlet Support API (read-only, GET only).
 *
 * Auth:    Authorization: Bearer <INTERNAL_AI_TOKEN>
 * Config:  TRENDLET_API_BASE  — e.g. https://trendlet.vercel.app
 *          INTERNAL_AI_TOKEN  — shared secret, never logged, never exposed to customers
 *
 * All three functions return the raw JSON envelope:
 *   { found: true,  ...data }   on success
 *   { found: false, error: { code, message } }  on not-found or any error
 *
 * Non-2xx HTTP is normalised into the error envelope so callers
 * never have to handle raw HTTP errors.
 */

import 'server-only'

// ── Response types ────────────────────────────────────────────────────────────

export interface TrendletSuccess {
  found:    true
  [key: string]: unknown
}

export interface TrendletError {
  found:  false
  error: {
    code:    string   // UNAUTHORIZED | INVALID_INPUT | ORDER_NOT_FOUND | RATE_LIMITED | UPSTREAM_ERROR
    message: string
  }
}

export type TrendletResult = TrendletSuccess | TrendletError

// ── Internal helpers ──────────────────────────────────────────────────────────

function getConfig(): { base: string; token: string } {
  const base  = process.env.TRENDLET_API_BASE
  const token = process.env.INTERNAL_AI_TOKEN
  if (!base)  throw new Error('[trendletClient] TRENDLET_API_BASE env var is not set')
  if (!token) throw new Error('[trendletClient] INTERNAL_AI_TOKEN env var is not set')
  return { base: base.replace(/\/$/, ''), token }
}

async function trendletFetch(path: string): Promise<TrendletResult> {
  const { base, token } = getConfig()

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 10_000) // 10 s

  try {
    const res = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache:  'no-store', // always live data
    })

    clearTimeout(timeout)

    // Non-2xx → wrap in error envelope (never throw to callers)
    if (!res.ok && res.status !== 200) {
      const body = await res.text().catch(() => '')
      console.error(`[trendletClient] HTTP ${res.status} for ${path}`)

      if (res.status === 401) {
        return { found: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API token — contact system administrator.' } }
      }
      if (res.status === 429) {
        return { found: false, error: { code: 'RATE_LIMITED', message: 'Too many requests — please try again shortly.' } }
      }
      return { found: false, error: { code: 'UPSTREAM_ERROR', message: `Upstream error (HTTP ${res.status})` } }
    }

    const json = await res.json()
    return json as TrendletResult

  } catch (err) {
    clearTimeout(timeout)

    if ((err as Error).name === 'AbortError') {
      console.error(`[trendletClient] Timeout fetching ${path}`)
      return { found: false, error: { code: 'UPSTREAM_ERROR', message: 'Request timed out — please try again.' } }
    }

    console.error(`[trendletClient] Network error fetching ${path}:`, (err as Error).message)
    return { found: false, error: { code: 'UPSTREAM_ERROR', message: 'Network error — please try again later.' } }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * GET /api/support/orders/{orderNumber}
 * Returns the order + ALL sub-orders, each with status, statusChangedAt, and tracking.
 * Also returns summary.mixedStatuses.
 */
export async function getOrderDetails(orderNumber: string): Promise<TrendletResult> {
  if (!orderNumber?.trim()) {
    return { found: false, error: { code: 'INVALID_INPUT', message: 'Order number is required.' } }
  }
  return trendletFetch(`/api/support/orders/${encodeURIComponent(orderNumber.trim())}`)
}

/**
 * GET /api/support/search/email?q={email}
 * Returns a capped list of order summaries for the customer email.
 * Call getOrderDetails for full details on any returned order.
 */
export async function searchOrdersByEmail(email: string): Promise<TrendletResult> {
  if (!email?.trim()) {
    return { found: false, error: { code: 'INVALID_INPUT', message: 'Email address is required.' } }
  }
  return trendletFetch(`/api/support/search/email?q=${encodeURIComponent(email.trim())}`)
}

/**
 * GET /api/support/orders/{orderNumber}/tracking
 * Returns shipments grouped by tracking number, with shippedAt, deliveredAt,
 * shipmentStatus, and which sub-orders are in each shipment.
 */
export async function getShipmentTracking(orderNumber: string): Promise<TrendletResult> {
  if (!orderNumber?.trim()) {
    return { found: false, error: { code: 'INVALID_INPUT', message: 'Order number is required.' } }
  }
  return trendletFetch(`/api/support/orders/${encodeURIComponent(orderNumber.trim())}/tracking`)
}
