'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/server/supabase/server'
import { getServerSession } from '@/server/supabase/server'
import type { ActionState, WorkspaceSettings, SystemPrompt } from '@/types'

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

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
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
  const supabase  = await createSupabaseServerClient()

  const payload = {
    name:        formData.get('name') as string,
    content:     formData.get('content') as string,
    model:       formData.get('model') as string,
    provider:    formData.get('provider') as SystemPrompt['provider'],
    temperature: Number(formData.get('temperature')) || 0.7,
    is_active:   isActive,
    created_by:  session.profile.id,
  }

  // If setting as active, deactivate all others first
  if (isActive) {
    await supabase.from('system_prompts').update({ is_active: false }).neq('id', id ?? '')
  }

  let error
  if (id && !id.startsWith('new-')) {
    const res = await supabase
      .from('system_prompts')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    error = res.error
  } else {
    const res = await supabase.from('system_prompts').insert(payload)
    error = res.error
  }

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}

// ── Delete system prompt ──────────────────────────────────────────────────────
export async function deleteSystemPromptAction(id: string): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('system_prompts').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return {}
}
