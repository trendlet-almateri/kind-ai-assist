/**
 * app/api/cron/auto-return/route.ts
 *
 * Runs every minute via Vercel Cron (vercel.json).
 *
 * Hierarchy (must ALL be true before auto-returning):
 *   1. workspace.ai_enabled = true          ← master switch
 *   2. workspace.auto_return_enabled = true  ← auto-return feature
 *   3. conversation.is_ai_active = false     ← human has taken over
 *   4. conversation.status = 'assigned'
 *   5. agent_last_reply_at < now - X minutes ← agent has been idle
 *
 * On match:
 *   → flip is_ai_active = true, status = open, clear assigned_agent
 *   → insert system message visible in chat: "AI resumed…"
 *   → log ai_resumed event in takeover_events
 *
 * Protected by CRON_SECRET — only Vercel can call this.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/server/supabase/admin'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getSupabaseAdminClient()

  // ── 1. Read admin settings ────────────────────────────────────────────────
  const { data: settings, error: settingsErr } = await db
    .from('workspace_settings')
    .select('workspace_id, ai_enabled, auto_return_enabled, auto_return_ai_minutes')
    .limit(1)
    .single()

  if (settingsErr || !settings) {
    console.error('[AutoReturn] Could not read workspace_settings:', settingsErr)
    return NextResponse.json({ error: 'settings read failed' }, { status: 500 })
  }

  // Master switch OFF → never auto-return
  if (!settings.ai_enabled) {
    return NextResponse.json({ skipped: true, reason: 'ai_enabled is false (master switch OFF)' })
  }

  // Feature toggle OFF → admin disabled it
  if (!settings.auto_return_enabled) {
    return NextResponse.json({ skipped: true, reason: 'auto_return_enabled is false' })
  }

  const minutes = settings.auto_return_ai_minutes ?? 5

  // ── 2. Find conversations eligible for auto-return ────────────────────────
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()

  const { data: conversations, error: convErr } = await db
    .from('conversations')
    .select('id, assigned_agent, workspace_id')
    .eq('workspace_id', settings.workspace_id)
    .eq('is_ai_active', false)
    .eq('status', 'assigned')
    .eq('needs_human_review', false)   // NEVER auto-return escalated conversations
    .is('deleted_at', null)
    .lt('agent_last_reply_at', cutoff)
    .not('agent_last_reply_at', 'is', null)

  if (convErr) {
    console.error('[AutoReturn] Conversation query failed:', convErr)
    return NextResponse.json({ error: 'query failed' }, { status: 500 })
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ returned: 0 })
  }

  const now = new Date().toISOString()
  const ids = conversations.map((c) => c.id)

  // ── 3. Flip conversations back to AI ──────────────────────────────────────
  const { error: updateErr } = await db
    .from('conversations')
    .update({
      is_ai_active:        true,
      status:              'open',
      assigned_agent:      null,
      agent_last_reply_at: null,
      session_started_at:  now,   // Reset session boundary so AI cannot see old escalation messages
      updated_at:          now,
    })
    .in('id', ids)

  if (updateErr) {
    console.error('[AutoReturn] Update failed:', updateErr)
    return NextResponse.json({ error: 'update failed' }, { status: 500 })
  }

  // ── 4. Insert system message in each conversation (visible in chat) ────────
  const systemMessages = ids.map((id) => ({
    workspace_id:    settings.workspace_id,
    conversation_id: id,
    role:            'system' as const,
    content:         `AI resumed — agent was inactive for ${minutes} minutes`,
    sender_name:     'System',
    is_read:         true,
    metadata:        {},
  }))

  const { error: msgErr } = await db.from('messages').insert(systemMessages)
  if (msgErr) console.error('[AutoReturn] System message insert failed (non-fatal):', msgErr)

  // ── 5. Log ai_resumed event for each conversation ─────────────────────────
  const events = conversations
    .filter((c) => c.assigned_agent)
    .map((c) => ({
      workspace_id:    settings.workspace_id,
      conversation_id: c.id,
      agent_id:        c.assigned_agent as string,
      event_type:      'ai_resumed' as const,
      note:            `Auto-returned after ${minutes} minutes of inactivity`,
    }))

  if (events.length > 0) {
    const { error: evtErr } = await db.from('takeover_events').insert(events)
    if (evtErr) console.error('[AutoReturn] Event logging failed (non-fatal):', evtErr)
  }

  console.log(`[AutoReturn] Returned ${ids.length} conversation(s) to AI after ${minutes}min`)
  return NextResponse.json({ returned: ids.length, conversationIds: ids })
}
