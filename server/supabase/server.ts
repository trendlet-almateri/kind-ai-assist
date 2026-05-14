/**
 * server/supabase/server.ts
 * Server-side Supabase client — used in Server Components, Server Actions,
 * Route Handlers, and Middleware.
 *
 * WHY createServerClient (not createClient):
 * - Next.js App Router runs on the Edge/Node.js server where there is no
 *   browser localStorage. @supabase/ssr's createServerClient reads auth
 *   tokens from HTTP cookies instead, keeping sessions secure server-side.
 *
 * WHY async cookies():
 * - Next.js 15 made cookies() async. We must await it before passing to
 *   createServerClient so cookie reads/writes are non-blocking.
 *
 * SECURITY: This client uses the ANON key — RLS policies still apply.
 * Use the admin client (admin.ts) only in trusted server-only contexts.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// cache() deduplicates this within a single request —
// multiple Server Components calling createSupabaseServerClient()
// get the same instance instead of creating a new one each time.
export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot set cookies — ignore.
            // Middleware handles session refresh instead.
          }
        },
      },
    }
  )
})

/**
 * getServerSession
 * Convenience helper: returns the authenticated user + agent profile
 * in a single call. Used in every Server Component that needs auth context.
 *
 * Returns null if the user is not authenticated.
 */
// cache() ensures this runs at most once per request even if
// the layout and page both call getServerSession().
export const getServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('agent_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return { user, profile }
})
