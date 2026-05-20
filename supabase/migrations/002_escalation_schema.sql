-- ============================================================
-- 002_escalation_schema.sql
-- Escalation workflow improvements:
--   1. Allow AI-initiated escalation events (agent_id nullable)
--   2. New 'ai_escalated' event type (distinct from human_took_over)
--   3. ai_pause_reason column for richer UI messaging
--   4. Queue performance index
-- Run against: ysnheuddlfafaqfrwzxl.supabase.co
-- ============================================================

-- 1. Make agent_id nullable in takeover_events
--    AI-initiated escalations have no human agent assigned yet.
ALTER TABLE takeover_events ALTER COLUMN agent_id DROP NOT NULL;

-- 2. Add 'ai_escalated' to the takeover_type enum
--    Semantically distinct from 'human_took_over' (agent action).
ALTER TYPE takeover_type ADD VALUE IF NOT EXISTS 'ai_escalated';

-- Also add conversation lifecycle types if not already present
ALTER TYPE takeover_type ADD VALUE IF NOT EXISTS 'conversation_resolved';
ALTER TYPE takeover_type ADD VALUE IF NOT EXISTS 'conversation_reopened';

-- 3. Add ai_pause_reason for richer UI context
--    Tells agents (and the UI) WHY the AI is currently paused.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_pause_reason TEXT
    CHECK (ai_pause_reason IN (
      'escalation',          -- AI called escalate_to_human or keyword triggered
      'manual_takeover',     -- Agent clicked "Take Over"
      'auto_return_disabled', -- auto_return_enabled = false
      'admin_disabled_ai'    -- workspace ai_enabled = false
    ))
    DEFAULT NULL;

-- 4. Index for queue query performance
--    Speeds up: WHERE needs_human_review = true AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_conversations_queue
  ON conversations (workspace_id, needs_human_review, assigned_agent)
  WHERE deleted_at IS NULL AND needs_human_review = TRUE;
