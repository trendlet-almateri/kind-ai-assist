'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/server/supabase/server'
import { getServerSession } from '@/server/supabase/server'
import { inviteAgentSchema } from '@/lib/validators/invite'
import type { ActionState, AgentRole, AgentStatus } from '@/types'

// ── Invite agent ─────────────────────────────────────────────────────────────
export async function inviteAgentAction(
  _prev: ActionState<{ agentId: string }>,
  formData: FormData
): Promise<ActionState<{ agentId: string }>> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  const parsed = inviteAgentSchema.safeParse({
    full_name: formData.get('full_name'),
    username:  formData.get('username'),
    email:     formData.get('email'),
    role:      formData.get('role') ?? 'agent',
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Call the edge function — it has the service role key to invite users
  const supabase = await createSupabaseServerClient()
  const { data: { session: authSession } } = await supabase.auth.getSession()

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-agent`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authSession?.access_token ?? ''}`,
      },
      body: JSON.stringify(parsed.data),
    }
  )

  const result = await res.json()

  if (!res.ok) {
    return { error: result.error ?? 'Invite failed' }
  }

  revalidatePath('/agents')
  return { data: { agentId: result.agent_id } }
}

// ── Update agent status ───────────────────────────────────────────────────────
export async function updateAgentStatusAction(
  agentId: string,
  status: AgentStatus
): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  // Prevent self-demotion
  if (agentId === session.profile.id && status !== 'active') {
    return { error: 'Cannot change your own status' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('agent_profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', agentId)

  if (error) return { error: error.message }

  revalidatePath('/agents')
  return {}
}

// ── Update agent role ─────────────────────────────────────────────────────────
export async function updateAgentRoleAction(
  agentId: string,
  role: AgentRole
): Promise<ActionState> {
  const session = await getServerSession()
  if (!session || session.profile.role !== 'admin') {
    return { error: 'Admin access required' }
  }

  if (agentId === session.profile.id) {
    return { error: 'Cannot change your own role' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('agent_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', agentId)

  if (error) return { error: error.message }

  revalidatePath('/agents')
  return {}
}
