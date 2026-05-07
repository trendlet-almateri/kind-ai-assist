/**
 * lib/queryClient.ts
 * Shared React Query client configuration.
 *
 * WHY a separate module:
 * - The QueryClient must be created ONCE per app instance.
 * - Placing it here lets the provider (components/providers/QueryProvider.tsx)
 *   import the shared instance while tests can override it cleanly.
 *
 * Configuration rationale:
 * - staleTime 10s: most dashboard data is fine being 10s old.
 * - retry 1: one retry on network failure, then show error.
 * - refetchOnWindowFocus: false in dev to reduce noise, true in prod.
 */

import { QueryClient } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1,
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

// Browser singleton — one QueryClient for the entire browser session
let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new client (no singleton across requests)
    return makeQueryClient()
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }

  return browserQueryClient
}
