-- ============================================================
-- 004_activity_event_types.sql
-- Add takeover_type enum values for agent actions in escalation flow
-- ============================================================

-- agent_assigned: agent clicked "Assign to Me" on an escalated conversation
ALTER TYPE takeover_type ADD VALUE IF NOT EXISTS 'agent_assigned';

-- escalation_reviewed: agent clicked "Mark as Reviewed" — cleared escalation without full takeover
ALTER TYPE takeover_type ADD VALUE IF NOT EXISTS 'escalation_reviewed';
