'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/server/supabase/server'
import { getSupabaseAdminClient } from '@/server/supabase/admin'
import type { ActionState, WorkspaceSettings, SystemPrompt } from '@/types'

// ── Manually trigger auto-return (admin only) ─────────────────────────────────
// Same logic as the cron but callable from the Settings UI.
// Useful on Vercel Hobby where crons only fire once per day.
export async function triggerAutoReturnAction(): Promise<ActionState<{ returned: number; skipped?: string }>> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const db = getSupabaseAdminClient()

  const { data: settings } = await db
    .from('workspace_settings')
    .select('workspace_id, ai_enabled, auto_return_enabled, auto_return_ai_minutes')
    .limit(1)
    .single()

  if (!settings) return { error: 'Could not read workspace settings' }
  if (!settings.ai_enabled) return { error: 'Bot Auto-Reply is disabled — enable it first' }
  if (!settings.auto_return_enabled) return { error: 'Auto-Return to AI is disabled — enable it first' }

  const minutes = settings.auto_return_ai_minutes ?? 5
  const cutoff  = new Date(Date.now() - minutes * 60 * 1000).toISOString()

  const { data: conversations, error: convErr } = await db
    .from('conversations')
    .select('id, assigned_agent, workspace_id')
    .eq('workspace_id', settings.workspace_id)
    .eq('is_ai_active', false)
    .eq('status', 'assigned')
    .eq('needs_human_review', false)
    .is('deleted_at', null)
    .lt('agent_last_reply_at', cutoff)
    .not('agent_last_reply_at', 'is', null)

  if (convErr) return { error: convErr.message }
  if (!conversations || conversations.length === 0) {
    return { data: { returned: 0, skipped: `No conversations idle for ${minutes}+ minutes` } }
  }

  const now = new Date().toISOString()
  const ids  = conversations.map((c) => c.id)

  await db.from('conversations').update({
    is_ai_active: true, status: 'open', assigned_agent: null,
    agent_last_reply_at: null, updated_at: now,
  }).in('id', ids)

  await db.from('messages').insert(ids.map((id) => ({
    workspace_id: settings.workspace_id, conversation_id: id,
    role: 'system' as const,
    content: `AI resumed — agent was inactive for ${minutes} minutes`,
    sender_name: 'System', is_read: true, metadata: {},
  })))

  const events = conversations.filter((c) => c.assigned_agent).map((c) => ({
    workspace_id: settings.workspace_id, conversation_id: c.id,
    agent_id: c.assigned_agent as string, event_type: 'ai_resumed' as const,
    note: `Manually triggered — inactive for ${minutes}+ minutes`,
  }))
  if (events.length > 0) await db.from('takeover_events').insert(events)

  revalidatePath('/settings')
  return { data: { returned: ids.length } }
}

// ── Save workspace settings ───────────────────────────────────────────────────
export async function saveWorkspaceSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const keywordsRaw = formData.get('escalation_keywords') as string
  const keywords    = keywordsRaw
    ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean)
    : []

  const updates: Partial<WorkspaceSettings> = {
    ai_enabled:              formData.get('ai_enabled') === 'true',
    auto_return_enabled:     formData.get('auto_return_enabled') === 'true',
    auto_return_ai_minutes:  Number(formData.get('auto_return_ai_minutes')) || 5,
    escalation_enabled:      formData.get('escalation_enabled') === 'true',
    escalation_keywords:     keywords,
    updated_at:              new Date().toISOString(),
  }

  // Use admin client — workspace_settings RLS blocks regular-key updates.
  // Role is already verified as 'admin' above, so service role is safe.
  const db = getSupabaseAdminClient()
  const { error } = await db
    .from('workspace_settings')
    .update(updates)
    .not('id', 'is', null) // update the single settings row

  if (error) return { error: error.message }

  revalidatePath('/', 'layout') // AI badge in sidebar must refresh
  return {}
}

// ── Save system prompt ────────────────────────────────────────────────────────
export async function saveSystemPromptAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const id        = formData.get('id') as string | null
  const isActive  = formData.get('is_active') === 'true'
  // Use admin client — system_prompts RLS blocks anon key inserts/updates.
  // We already verified admin role above, so service role is safe here.
  const db = getSupabaseAdminClient()

  const payload = {
    name:         formData.get('name') as string,
    content:      formData.get('content') as string,
    model:        formData.get('model') as string,
    provider:     formData.get('provider') as SystemPrompt['provider'],
    temperature:  Number(formData.get('temperature')) || 0.7,
    is_active:    isActive,
    created_by:   session.profile.id,
    workspace_id: '00000000-0000-0000-0000-000000000001',
  }

  // If setting as active, deactivate all others first
  if (isActive) {
    await db.from('system_prompts').update({ is_active: false }).neq('id', id ?? '')
  }

  let error
  if (id) {
    const res = await db
      .from('system_prompts')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    error = res.error
  } else {
    const res = await db.from('system_prompts').insert(payload)
    error = res.error
  }

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { data: true }
}

// ── Delete system prompt ──────────────────────────────────────────────────────
export async function deleteSystemPromptAction(id: string): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const db = getSupabaseAdminClient()
  const { error } = await db.from('system_prompts').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}
