/**
 * server/supabase/admin.ts
 * Service-role Supabase client — bypasses ALL RLS policies.
 *
 * WHY a separate file:
 * - Making it physically separate from the anon client prevents accidental
 *   imports in Client Components (Next.js will error if server-only code
 *   is bundled into the client).
 * - The service role key is NEVER exposed to the browser.
 *
 * USAGE RULES:
 * ✅ Webhook Route Handlers (WhatsApp inbound)
 * ✅ AI reply engine (needs to write messages + read workspace settings)
 * ✅ Invite edge function calls
 * ❌ NEVER import in Client Components
 * ❌ NEVER use for user-initiated mutations (use anon client with RLS)
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Singleton — one admin client per process
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: ReturnType<typeof createClient<any>> | undefined

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return adminClient
}
