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
import { cookies } from 'next/headers'
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
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Invalid email or password' }
    }
    return { error: `DEBUG: ${error.message} | code: ${(error as any).code} | status: ${error.status}` }
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

  // Cache role + status in cookies so middleware doesn't need a DB call
  // on every navigation to admin routes.
  const cookieStore = await cookies()
  const cookieOpts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 7 }
  cookieStore.set('x-user-role',   profile.role,   cookieOpts)
  cookieStore.set('x-user-status', profile.status, cookieOpts)

  revalidatePath('/', 'layout')

  // Redirect based on role — admins go to dashboard, agents to inbox
  redirect(profile.role === 'admin' ? '/dashboard' : '/inbox')
}

// ── Logout ──────────────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const cookieStore = await cookies()
  cookieStore.delete('x-user-role')
  cookieStore.delete('x-user-status')

  revalidatePath('/', 'layout')
  redirect('/login')
}
