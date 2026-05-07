/**
 * lib/constants.ts
 * App-wide constants. Centralised so magic strings live in one place.
 */

export const APP_NAME = 'SupportAI'
export const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Supabase Storage ──────────────────────────────────
export const STORAGE_BUCKET_KNOWLEDGE = 'knowledge-base'

// ── Pagination ────────────────────────────────────────
export const AGENTS_PER_PAGE    = 20
export const KNOWLEDGE_PER_PAGE = 20

// ── React Query stale times (ms) ─────────────────────
export const STALE_30S  = 30_000
export const STALE_10S  = 10_000
export const STALE_5S   =  5_000

// ── Dashboard chart ───────────────────────────────────
export const CHART_DAYS = 7

// ── Dashboard status colors ───────────────────────────
export const STATUS_COLORS = {
  open:     '#3B82F6',
  assigned: '#F59E0B',
  resolved: '#10B981',
  closed:   '#4B5563',
} as const

// ── Escalation default keywords ───────────────────────
export const DEFAULT_ESCALATION_KEYWORDS = [
  'urgent', 'cancel', 'refund', 'lawsuit', 'angry', 'manager',
]

// ── Route paths ───────────────────────────────────────
export const ROUTES = {
  login:     '/login',
  dashboard: '/dashboard',
  inbox:     '/inbox',
  knowledge: '/knowledge',
  agents:    '/agents',
  settings:  '/settings',
} as const

// ── WhatsApp API ──────────────────────────────────────
export const WHATSAPP_API_VERSION = 'v19.0'
export const WHATSAPP_API_BASE    = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`
