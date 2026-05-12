'use server'

/**
 * features/auth/actions.ts — Server Actions for authentication
 *
 * WHY Server Actions (not API routes):
 * - Server Actions run on the server, so the Supabase service role key and
 *   session cookies are never exposed to the browser.
 * - They integrate with React's form state, giving type-safe error feedback.
 * - No extra fetch() round-trip — the form submission IS the server call.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/server/supabase/server'
import type { ActionState } from '@/types'

// ── Login ───────────────────────────────────────────────────────────────────
export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    console.error('[login] auth error:', { message: error.message, code: (error as any).code, status: error.status })
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Invalid email or password' }
    }
    return { error: `${error.message} (code: ${(error as any).code}, status: ${error.status})` }
  }

  if (!data.user) {
    return { error: 'Sign in failed. Please try again.' }
  }

  // Verify the agent profile exists and is active
  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('status, role')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'Account not found. Contact your administrator.' }
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut()
    return { error: 'Your account has been suspended. Contact your administrator.' }
  }

  revalidatePath('/', 'layout')

  // Redirect based on role — admins go to dashboard, agents to inbox
  redirect(profile.role === 'admin' ? '/dashboard' : '/inbox')
}

// ── Logout ──────────────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
