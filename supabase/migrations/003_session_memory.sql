-- ============================================================
-- 003_session_memory.sql
-- Session-based memory architecture:
--   1. session_started_at — source of truth for AI session boundaries
--   2. conversation_summary_ai — sanitized memory injected into OpenAI context
--   3. conversation_summary_internal — agents/admins only, never sent to OpenAI
-- Run against: ysnheuddlfafaqfrwzxl.supabase.co
-- ============================================================

-- 1. session_started_at: marks when the current conversation session began.
--    Reset on every genuine new session (reopen after resolve).
--    NOT reset on auto-return or agent takeover (same session continues).
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ DEFAULT now();

-- 2. AI-safe summary: injected into OpenAI context between sessions.
--    Contains only durable customer facts and preferences.
--    NEVER contains escalation events, emotional content, or human takeover details.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_summary_ai TEXT DEFAULT NULL;

-- 3. Internal summary: visible to agents and admins only.
--    Contains full operational detail: escalation reasons, agent handling, customer behavior.
--    NEVER sent to OpenAI under any circumstances.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_summary_internal TEXT DEFAULT NULL;

-- 4. Backfill: set session_started_at for all existing rows so it is never NULL.
--    Uses updated_at as a safe approximation of when the current state began.
UPDATE conversations
  SET session_started_at = updated_at
  WHERE session_started_at IS NULL;
