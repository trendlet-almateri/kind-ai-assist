/**
 * types/index.ts
 * Re-exports database types + defines application-level types
 * (API responses, form payloads, filter states, etc.)
 */

export * from './database'

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  profile: import('./database').AgentProfile
}

// ── Inbox filters ──────────────────────────────────────────────────────────
export type ConvFilter = 'all' | 'open' | 'assigned_to_me' | 'needs_review'

// ── API response shapes ────────────────────────────────────────────────────
export interface ApiSuccess<T = void> {
  success: true
  data?: T
}

export interface ApiError {
  success: false
  error: string
}

export type ApiResult<T = void> = ApiSuccess<T> | ApiError

// ── Server Action result ────────────────────────────────────────────────────
export interface ActionState<T = void> {
  data?: T
  error?: string
}

// ── Dashboard KPI ──────────────────────────────────────────────────────────
export interface PeriodValues {
  day: number
  week: number
  month: number
  prevDay: number
  prevWeek: number
  prevMonth: number
}

export interface KpiData {
  conversations: PeriodValues
  aiResolutionRate: PeriodValues
  totalTokensUsed: PeriodValues
  escalationsToday: number
  escalationsYesterday: number
}

export interface DailyConversations {
  day: string
  label: string
  aiHandled: number
  agentHandled: number
}

export interface StatusBreakdown {
  status: import('./database').ConvStatus
  count: number
  color: string
}

// ── WhatsApp webhook payload types ──────────────────────────────────────────
export interface WhatsAppWebhookBody {
  object: string
  entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
  id: string
  changes: WhatsAppChange[]
}

export interface WhatsAppChange {
  value: WhatsAppValue
  field: string
}

export interface WhatsAppValue {
  messaging_product: string
  metadata: { display_phone_number: string; phone_number_id: string }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppInboundMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppContact {
  profile: { name: string }
  wa_id: string
}

export interface WhatsAppInboundMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
}

export interface WhatsAppStatus {
  id: string
  status: string
  timestamp: string
  recipient_id: string
}
