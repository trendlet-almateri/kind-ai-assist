/**
 * server/supabase/client.ts
 * Browser-side Supabase client — used ONLY in Client Components.
 *
 * WHY @supabase/ssr createBrowserClient:
 * - Reads/writes auth cookies automatically so the session is shared
 *   with the server without extra round-trips.
 * - Singleton pattern prevents multiple GoTrueClient warnings in dev.
 */

import { createBrowserClient } from '@supabase/ssr'

// Re-export a typed alias so every import stays clean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = ReturnType<typeof createBrowserClient<any>>

let client: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}

// Convenience default export for quick imports
export const supabase = getSupabaseBrowserClient()
