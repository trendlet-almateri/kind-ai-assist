/**
 * database.ts
 * Single source of truth for all Supabase table types.
 * Generated shape matches the live schema — workspace_id added
 * everywhere for multi-tenant isolation.
 *
 * WHY: Centralising types here means every Server Action, Route Handler,
 * and client hook imports from ONE place. If the schema changes, one file
 * changes and TypeScript surfaces every broken callsite immediately.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ──────────────────────────────────────────────────────────────────
export type AgentRole    = 'admin' | 'agent'
export type AgentStatus  = 'active' | 'suspended' | 'archived'
export type ConvChannel  = 'web' | 'whatsapp'
export type ConvStatus   = 'open' | 'assigned' | 'resolved' | 'closed'
export type MessageRole  = 'user' | 'assistant' | 'agent' | 'system'
export type TakeoverType = 'human_took_over' | 'ai_resumed'
export type LLMProvider  = 'openai' | 'openrouter'
export type KnowledgeStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted'

// ── workspaces ─────────────────────────────────────────────────────────────
export interface Workspace {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

// ── agent_profiles ─────────────────────────────────────────────────────────
export interface AgentProfile {
  id: string               // FK → auth.users.id
  workspace_id: string     // FK → workspaces.id
  full_name: string
  username: string
  email: string
  role: AgentRole
  status: AgentStatus
  is_online: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── conversations ──────────────────────────────────────────────────────────
export interface Conversation {
  id: string
  workspace_id: string
  channel: ConvChannel
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  status: ConvStatus
  is_ai_active: boolean
  assigned_agent: string | null  // FK → agent_profiles.id
  auto_return_enabled: boolean
  agent_last_reply_at: string | null
  needs_human_review: boolean
  escalation_reason: string | null
  metadata: Record<string, Json>
  created_at: string
  updated_at: string
  deleted_at: string | null      // soft delete
}

// ── messages ───────────────────────────────────────────────────────────────
export interface Message {
  id: string
  workspace_id: string
  conversation_id: string        // FK → conversations.id
  role: MessageRole
  content: string
  sender_name: string | null
  is_read: boolean
  model_used: string | null
  tokens_used: number | null
  metadata: Record<string, Json>
  created_at: string
}

// ── takeover_events ────────────────────────────────────────────────────────
export interface TakeoverEvent {
  id: string
  workspace_id: string
  conversation_id: string        // FK → conversations.id
  agent_id: string               // FK → agent_profiles.id
  event_type: TakeoverType
  note: string | null
  created_at: string
}

// ── knowledge_sources ──────────────────────────────────────────────────────
export interface KnowledgeSource {
  id: string
  workspace_id: string
  name: string
  description: string | null
  file_name: string
  file_type: string
  file_size: number | null
  storage_path: string | null
  openai_file_id: string | null
  openai_vs_file_id: string | null
  status: KnowledgeStatus
  error_msg: string | null
  uploaded_by: string | null     // FK → agent_profiles.id
  created_at: string
  updated_at: string
}

// ── system_prompts ─────────────────────────────────────────────────────────
export interface SystemPrompt {
  id: string
  workspace_id: string
  name: string
  content: string
  is_active: boolean
  model: string
  provider: LLMProvider
  temperature: number
  created_by: string | null      // FK → agent_profiles.id
  created_at: string
  updated_at: string
}

// ── workspace_settings ─────────────────────────────────────────────────────
export interface WorkspaceSettings {
  id: string
  workspace_id: string           // 1:1 with workspaces
  ai_enabled: boolean
  auto_return_ai_minutes: number
  auto_return_enabled: boolean
  escalation_enabled: boolean
  escalation_keywords: string[]
  openai_vector_store_id: string | null
  created_at: string
  updated_at: string
}

// ── twilio_messages ────────────────────────────────────────────────────────
// Raw webhook log — never shown directly to users, used for debugging
export interface TwilioMessage {
  id: string
  workspace_id: string
  message_sid: string
  from_number: string
  to_number: string
  body: string | null
  direction: 'inbound' | 'outbound'
  profile_name: string | null
  status: string | null
  conversation_id: string | null // FK → conversations.id
  raw_payload: Json
  created_at: string
}

// ── Joined / enriched types used in the UI ─────────────────────────────────
export interface AgentWithConvCount extends AgentProfile {
  assigned_conversations: number
}

export interface KnowledgeSourceWithUploader extends KnowledgeSource {
  uploader_name: string | null
  uploader_avatar: string | null
}

export interface ConversationWithLastMessage extends Conversation {
  last_message?: {
    content: string
    role: MessageRole
    created_at: string
  }
}

export interface AgentActivity extends AgentProfile {
  assigned_count: number
}

