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
import type { Database } from '@/types/database'

// Re-export a typed alias so every import stays clean
export type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let client: SupabaseClient | undefined

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}

// Convenience default export for quick imports
export const supabase = getSupabaseBrowserClient()
