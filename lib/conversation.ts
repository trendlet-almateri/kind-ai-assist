/**
 * lib/conversation.ts
 * Shared conversation state helpers — importable from both client and server.
 *
 * WHY a shared helper:
 * There are two paths that reopen a conversation (Twilio webhook + agent UI).
 * Both must reset the EXACT same fields or session isolation breaks.
 * A single function guarantees the field list never diverges.
 */

/**
 * Returns the update payload for reopening a resolved conversation.
 *
 * Resets ALL escalation state and sets session_started_at to now()
 * so the AI receives a clean session with no leaked prior context.
 *
 * Used by:
 *   - app/api/webhooks/twilio/route.ts  (customer messages a resolved conv)
 *   - features/inbox/hooks/useInboxData.ts  (agent clicks Reopen in UI)
 *
 * NOT used by:
 *   - auto-return cron (same live session, no session boundary reset)
 *   - agent Take Over / Return to AI (same live session)
 */
export function buildReopenPayload() {
  const now = new Date().toISOString()
  return {
    status:              'open'  as const,
    is_ai_active:        true,
    assigned_agent:      null,
    resolved_at:         null,
    needs_human_review:  false,
    escalation_reason:   null,
    ai_pause_reason:     null,
    session_started_at:  now,
    updated_at:          now,
  }
}
